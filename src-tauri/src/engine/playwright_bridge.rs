use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BridgeMessage {
    pub id: Option<u64>,
    pub command: Option<String>,
    pub params: Option<Value>,
    pub event: Option<String>,
    pub data: Option<Value>,
    pub success: Option<bool>,
    pub result: Option<Value>,
    pub error: Option<String>,
}



pub struct PlaywrightBridge {
    child: Arc<Mutex<Option<Child>>>,
    stdin: Arc<Mutex<Option<ChildStdin>>>,
    next_id: Arc<AtomicU64>,
    // pending_responses: map from message id → oneshot channel
    pending: Arc<Mutex<HashMap<u64, std::sync::mpsc::SyncSender<BridgeMessage>>>>,
    event_handlers: Arc<Mutex<HashMap<String, Vec<Box<dyn Fn(Value) + Send>>>>>,
}

impl PlaywrightBridge {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            stdin: Arc::new(Mutex::new(None)),
            next_id: Arc::new(AtomicU64::new(1)),
            pending: Arc::new(Mutex::new(HashMap::new())),
            event_handlers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn the Node.js playwright-bridge.js process.
    /// Returns immediately; the reader thread handles all stdout.
    pub fn launch(&mut self) -> Result<(), String> {
        // Kill any existing process first
        {
            let mut child_opt = self.child.lock().unwrap();
            if let Some(mut old) = child_opt.take() {
                let _ = old.kill();
                let _ = old.wait();
            }
        }
        {
            *self.stdin.lock().unwrap() = None;
        }
        {
            self.pending.lock().unwrap().clear();
        }

        // Resolve the path to playwright-bridge.js relative to the binary
        let bridge_script = Self::resolve_bridge_script()?;
        let browsers_path = Self::resolve_browsers_path()?;

        let mut child = Command::new("node")
            .arg(&bridge_script)
            .env("PLAYWRIGHT_BROWSERS_PATH", browsers_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit()) // forward stderr so we can see errors
            .spawn()
            .map_err(|e| format!("Failed to start playwright-bridge.js (node not found?): {}", e))?;

        let stdin = child.stdin.take().ok_or("Failed to get bridge stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get bridge stdout")?;

        *self.child.lock().unwrap() = Some(child);
        *self.stdin.lock().unwrap() = Some(stdin);

        // Spawn a dedicated reader thread — this is the ONLY reader of stdout
        let pending_clone = Arc::clone(&self.pending);
        let handlers_clone = Arc::clone(&self.event_handlers);

        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                let line = match line {
                    Ok(l) => l,
                    Err(_) => break,
                };
                if line.trim().is_empty() {
                    continue;
                }
                match serde_json::from_str::<BridgeMessage>(&line) {
                    Ok(msg) => {
                        if let Some(id) = msg.id {
                            // It's a response to a command
                            let mut pending = pending_clone.lock().unwrap();
                            if let Some(tx) = pending.remove(&id) {
                                let _ = tx.send(msg);
                            }
                        } else if let Some(ref event) = msg.event.clone() {
                            // It's an event notification
                            let handlers = handlers_clone.lock().unwrap();
                            if let Some(handlers_vec) = handlers.get(event) {
                                for handler in handlers_vec {
                                    if let Some(ref data) = msg.data {
                                        handler(data.clone());
                                    }
                                }
                            }
                        }
                    }
                    Err(_) => {
                        // Ignore non-JSON lines (e.g. debug prints)
                        eprintln!("[bridge-reader] non-JSON: {}", line);
                    }
                }
            }
        });

        Ok(())
    }

    fn resolve_bridge_script() -> Result<String, String> {
        // Try several locations relative to the binary and CWD
        let candidates = vec![
            // Development: running from workspace root
            "scripts/playwright-bridge.js".to_string(),
            // Development: running from src-tauri
            "../scripts/playwright-bridge.js".to_string(),
            // Packaged: next to the binary
            {
                let mut p = std::env::current_exe().unwrap_or_default();
                p.pop();
                p.push("playwright-bridge.js");
                p.to_string_lossy().into_owned()
            },
            // Packaged: resources/ directory
            {
                let mut p = std::env::current_exe().unwrap_or_default();
                p.pop();
                p.push("resources");
                p.push("playwright-bridge.js");
                p.to_string_lossy().into_owned()
            },
        ];

        for candidate in &candidates {
            if std::path::Path::new(candidate).exists() {
                return Ok(candidate.clone());
            }
        }

        Err(format!(
            "playwright-bridge.js not found. Tried: {:?}",
            candidates
        ))
    }

    fn resolve_browsers_path() -> Result<String, String> {
        let candidates = vec![
            // Development from root
            "src-tauri/browsers".to_string(),
            // Development from src-tauri
            "browsers".to_string(),
            "../src-tauri/browsers".to_string(),
            // Packaged next to binary
            {
                let mut p = std::env::current_exe().unwrap_or_default();
                p.pop();
                p.push("browsers");
                p.to_string_lossy().into_owned()
            },
            // Packaged in resources directory
            {
                let mut p = std::env::current_exe().unwrap_or_default();
                p.pop();
                p.push("resources");
                p.push("browsers");
                p.to_string_lossy().into_owned()
            },
        ];

        for candidate in &candidates {
            if std::path::Path::new(candidate).exists() {
                // Get absolute path to avoid issues if Node.js changes cwd
                if let Ok(abs) = std::fs::canonicalize(candidate) {
                    return Ok(abs.to_string_lossy().into_owned());
                }
                return Ok(candidate.clone());
            }
        }

        // Default fallback, Playwright will use its global cache if this doesn't exist
        Ok("browsers".to_string())
    }

    pub async fn send_command(&self, command: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        // Register a sync channel to receive the response
        let (tx, rx) = std::sync::mpsc::sync_channel::<BridgeMessage>(1);
        {
            self.pending.lock().unwrap().insert(id, tx);
        }

        // Serialize and write
        let msg = BridgeMessage {
            id: Some(id),
            command: Some(command.to_string()),
            params: Some(params),
            event: None,
            data: None,
            success: None,
            result: None,
            error: None,
        };
        let json =
            serde_json::to_string(&msg).map_err(|e| format!("Serialize error: {}", e))?;

        {
            let mut stdin_opt = self.stdin.lock().unwrap();
            if let Some(ref mut stdin) = *stdin_opt {
                writeln!(stdin, "{}", json).map_err(|e| format!("Write error: {}", e))?;
                stdin.flush().map_err(|e| format!("Flush error: {}", e))?;
            } else {
                self.pending.lock().unwrap().remove(&id);
                return Err("Bridge stdin not available — did you call launch()?".to_string());
            }
        }

        // Block-wait for the response (with timeout via tokio::task::spawn_blocking)
        let response = tokio::task::spawn_blocking(move || {
            rx.recv_timeout(std::time::Duration::from_secs(60))
                .map_err(|_| "Bridge command timed out after 60s".to_string())
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

        if response.success == Some(true) {
            Ok(response.result.unwrap_or(Value::Null))
        } else {
            Err(response.error.unwrap_or_else(|| "Unknown bridge error".to_string()))
        }
    }

    pub fn on_event<F>(&self, event: &str, handler: F)
    where
        F: Fn(Value) + Send + 'static,
    {
        let mut handlers = self.event_handlers.lock().unwrap();
        handlers
            .entry(event.to_string())
            .or_insert_with(Vec::new)
            .push(Box::new(handler));
    }

    pub fn is_running(&self) -> bool {
        self.stdin.lock().unwrap().is_some()
    }

    pub fn close(&self) -> Result<(), String> {
        {
            *self.stdin.lock().unwrap() = None;
        }
        let mut child_opt = self.child.lock().unwrap();
        if let Some(mut child) = child_opt.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        Ok(())
    }
}
