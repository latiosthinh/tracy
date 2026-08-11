use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedAgent {
    pub id: String,
    pub name: String,
    pub cli_binary: String,
    pub path: Option<String>,
    pub installed: bool,
    pub icon_name: String,
    pub category: String, // "local-cli" | "cloud-api"
    pub description: String,
}

pub struct AgentCliScanner;

impl AgentCliScanner {
    /// Return standard agent definitions to scan for
    pub fn get_definitions() -> Vec<DetectedAgent> {
        vec![
            DetectedAgent {
                id: "claude-code".to_string(),
                name: "Claude Code CLI".to_string(),
                cli_binary: if cfg!(windows) { "claude.cmd".to_string() } else { "claude".to_string() },
                path: None,
                installed: false,
                icon_name: "Sparkles".to_string(),
                category: "local-cli".to_string(),
                description: "Anthropic Claude Code CLI — auto-detected on PATH".to_string(),
            },
            DetectedAgent {
                id: "cursor-agent".to_string(),
                name: "Cursor Agent".to_string(),
                cli_binary: if cfg!(windows) { "cursor.cmd".to_string() } else { "cursor".to_string() },
                path: None,
                installed: false,
                icon_name: "Terminal".to_string(),
                category: "local-cli".to_string(),
                description: "Cursor CLI Agent — uses active Cursor editor login".to_string(),
            },
            DetectedAgent {
                id: "openai-codex".to_string(),
                name: "OpenAI Codex CLI".to_string(),
                cli_binary: if cfg!(windows) { "codex.cmd".to_string() } else { "codex".to_string() },
                path: None,
                installed: false,
                icon_name: "Code".to_string(),
                category: "local-cli".to_string(),
                description: "OpenAI Codex CLI agent".to_string(),
            },
            DetectedAgent {
                id: "gemini-cli".to_string(),
                name: "Gemini CLI Agent".to_string(),
                cli_binary: if cfg!(windows) { "gemini.cmd".to_string() } else { "gemini".to_string() },
                path: None,
                installed: false,
                icon_name: "Zap".to_string(),
                category: "local-cli".to_string(),
                description: "Google Gemini CLI — reuses gemini auth session".to_string(),
            },
            DetectedAgent {
                id: "copilot-cli".to_string(),
                name: "GitHub Copilot CLI".to_string(),
                cli_binary: if cfg!(windows) { "github-copilot-cli.cmd".to_string() } else { "github-copilot-cli".to_string() },
                path: None,
                installed: false,
                icon_name: "Bot".to_string(),
                category: "local-cli".to_string(),
                description: "GitHub Copilot CLI tool".to_string(),
            },
            DetectedAgent {
                id: "opencode".to_string(),
                name: "OpenCode Agent".to_string(),
                cli_binary: if cfg!(windows) { "opencode.cmd".to_string() } else { "opencode".to_string() },
                path: None,
                installed: false,
                icon_name: "Cpu".to_string(),
                category: "local-cli".to_string(),
                description: "OpenCode autonomous coding agent".to_string(),
            },
            DetectedAgent {
                id: "qwen-coder".to_string(),
                name: "Qwen Coder CLI".to_string(),
                cli_binary: if cfg!(windows) { "qwen-coder.cmd".to_string() } else { "qwen-coder".to_string() },
                path: None,
                installed: false,
                icon_name: "Globe".to_string(),
                category: "local-cli".to_string(),
                description: "Alibaba Qwen Coder CLI tool".to_string(),
            },
            DetectedAgent {
                id: "aider".to_string(),
                name: "Aider AI Pair Programmer".to_string(),
                cli_binary: if cfg!(windows) { "aider.exe".to_string() } else { "aider".to_string() },
                path: None,
                installed: false,
                icon_name: "Wrench".to_string(),
                category: "local-cli".to_string(),
                description: "Aider terminal coding assistant".to_string(),
            },
            DetectedAgent {
                id: "ibm-bob".to_string(),
                name: "IBM Bob Agent".to_string(),
                cli_binary: if cfg!(windows) { "bob.cmd".to_string() } else { "bob".to_string() },
                path: None,
                installed: false,
                icon_name: "Box".to_string(),
                category: "local-cli".to_string(),
                description: "IBM Bob coding assistant".to_string(),
            },
            // Cloud API Fallback
            DetectedAgent {
                id: "gemini-3.6-flash".to_string(),
                name: "Gemini 3.6 Flash (Direct API)".to_string(),
                cli_binary: "gemini-api".to_string(),
                path: Some("cloud".to_string()),
                installed: true,
                icon_name: "Sparkles".to_string(),
                category: "cloud-api".to_string(),
                description: "Direct Gemini API call server side".to_string(),
            },
        ]
    }

    /// Scan system PATH and extra directories (e.g. ~/.local/bin, ~/.npm-global/bin, etc.)
    pub fn scan() -> Vec<DetectedAgent> {
        let mut agents = Self::get_definitions();
        let path_var = env::var("PATH").unwrap_or_default();
        let mut search_paths: Vec<PathBuf> = env::split_paths(&path_var).collect();

        // Add additional common bin paths that GUI apps might miss
        if let Ok(home) = env::var("USERPROFILE").or_else(|_| env::var("HOME")) {
            let home_path = Path::new(&home);
            search_paths.push(home_path.join(".local").join("bin"));
            search_paths.push(home_path.join(".npm-global").join("bin"));
            search_paths.push(home_path.join(".bun").join("bin"));
            search_paths.push(home_path.join("AppData").join("Roaming").join("npm"));
            search_paths.push(PathBuf::from("/usr/local/bin"));
            search_paths.push(PathBuf::from("/opt/homebrew/bin"));
        }

        for agent in agents.iter_mut() {
            if agent.category == "cloud-api" {
                continue;
            }

            // Check if binary exists in any search path
            for dir in &search_paths {
                let bin_name = &agent.cli_binary;
                let full_path = dir.join(bin_name);
                let alt_path = if cfg!(windows) && !bin_name.ends_with(".exe") && !bin_name.ends_with(".cmd") {
                    Some(dir.join(format!("{}.exe", bin_name)))
                } else {
                    None
                };

                if full_path.exists() && full_path.is_file() {
                    agent.installed = true;
                    agent.path = Some(full_path.to_string_lossy().to_string());
                    break;
                } else if let Some(alt) = alt_path {
                    if alt.exists() && alt.is_file() {
                        agent.installed = true;
                        agent.path = Some(alt.to_string_lossy().to_string());
                        break;
                    }
                }
            }
        }

        agents
    }

    /// Execute a CLI agent process asynchronously, streaming stdout lines via Tauri event
    pub async fn run_agent_stream(
        app_handle: AppHandle,
        agent_id: String,
        prompt: String,
        system_instruction: String,
    ) -> Result<String, String> {
        let scanned = Self::scan();
        let agent = scanned
            .into_iter()
            .find(|a| a.id == agent_id)
            .ok_or_else(|| format!("Agent '{}' not recognized", agent_id))?;

        if !agent.installed && agent.category == "local-cli" {
            return Err(format!(
                "CLI Agent '{}' ({}) is not installed or not found on PATH",
                agent.name, agent.cli_binary
            ));
        }

        let full_prompt = format!("{}\n\n{}", system_instruction, prompt);
        let binary_path = agent.path.unwrap_or(agent.cli_binary);

        let mut cmd = Command::new(&binary_path);
        cmd.arg("-p")
           .arg(&full_prompt)
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        #[cfg(windows)]
        {
            // On Windows, run cmd.exe /C if it's a batch/cmd file
            if binary_path.ends_with(".cmd") || binary_path.ends_with(".bat") {
                cmd = Command::new("cmd");
                cmd.args(&["/C", &binary_path, "-p", &full_prompt])
                   .stdout(Stdio::piped())
                   .stderr(Stdio::piped());
            }
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to launch agent binary '{}': {}", binary_path, e))?;

        let stdout = child.stdout.take().ok_or("Failed to open agent stdout stream")?;
        let mut reader = BufReader::new(stdout).lines();

        let mut complete_output = String::new();

        while let Ok(Some(line)) = reader.next_line().await {
            complete_output.push_str(&line);
            complete_output.push('\n');

            // Emit chunk event to frontend
            let _ = app_handle.emit("ai-stream-chunk", serde_json::json!({
                "agentId": agent_id,
                "delta": line,
            }));
        }

        let status = child.wait().await.map_err(|e| format!("Agent execution error: {}", e))?;
        if !status.success() {
            tracing::warn!("Agent process exited with non-zero status: {:?}", status);
        }

        Ok(complete_output)
    }
}
