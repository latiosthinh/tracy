pub mod browser;
pub mod commands;
pub mod playwright_bridge;
pub mod selectors;

use crate::projects::yaml_parser::FlowFile;
use playwright_bridge::PlaywrightBridge;
use selectors::SelectorEngine;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamPayload {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

pub struct ExecutionEngine {
    bridge: Arc<Mutex<PlaywrightBridge>>,
    selector_engine: SelectorEngine,
}

impl ExecutionEngine {
    pub fn new() -> Self {
        Self {
            bridge: Arc::new(Mutex::new(PlaywrightBridge::new())),
            selector_engine: SelectorEngine::new(),
        }
    }

    /// Launch the Playwright browser (headless).
    /// Safe to call multiple times — kills any existing browser first.
    pub async fn launch_browser(&self, headless: bool) -> Result<(), String> {
        let mut bridge = self.bridge.lock().await;
        // Spawn the node process
        bridge.launch()?;
        // Tell the bridge to open the browser
        bridge
            .send_command(
                "launch",
                serde_json::json!({ "headless": headless }),
            )
            .await?;
        Ok(())
    }

    /// Navigate the Playwright browser to `url` and return a base64 PNG screenshot.
    pub async fn navigate_browser(&self, url: String) -> Result<serde_json::Value, String> {
        let bridge = self.bridge.lock().await;
        let result = bridge
            .send_command(
                "navigateAndScreenshot",
                serde_json::json!({ "url": url, "waitUntil": "domcontentloaded" }),
            )
            .await?;
        Ok(result)
    }

    pub async fn interact_browser(
        &self,
        action: String,
        x: Option<f64>,
        y: Option<f64>,
        delta_x: Option<f64>,
        delta_y: Option<f64>,
        key: Option<String>,
    ) -> Result<serde_json::Value, String> {
        let bridge = self.bridge.lock().await;
        let mut params = serde_json::json!({ "action": action });
        
        if let Some(v) = x { params["x"] = serde_json::json!(v); }
        if let Some(v) = y { params["y"] = serde_json::json!(v); }
        if let Some(v) = delta_x { params["deltaX"] = serde_json::json!(v); }
        if let Some(v) = delta_y { params["deltaY"] = serde_json::json!(v); }
        if let Some(v) = key { params["key"] = serde_json::json!(v); }

        let result = bridge.send_command("interact", params).await?;
        Ok(result)
    }

    /// Take a screenshot of the current page.
    pub async fn get_screenshot(&self) -> Result<String, String> {
        let bridge = self.bridge.lock().await;
        let result = bridge
            .send_command("screenshot", serde_json::json!({ "fullPage": false }))
            .await?;
        Ok(result
            .get("image")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string())
    }

    pub async fn get_dom_tree(&self) -> Result<serde_json::Value, String> {
        let bridge = self.bridge.lock().await;
        let result = bridge
            .send_command("getDomTree", serde_json::json!({}))
            .await?;
        Ok(result)
    }

    pub async fn inspect_element_at_point(&self, x: f64, y: f64) -> Result<serde_json::Value, String> {
        let bridge = self.bridge.lock().await;
        let result = bridge
            .send_command("inspectElementAtPoint", serde_json::json!({ "x": x, "y": y }))
            .await?;
        Ok(result)
    }

    pub async fn run_flow(
        &self,
        app_handle: AppHandle,
        flow: FlowFile,
        target_base_url: String,
        speed_ms: u64,
    ) -> Result<(), String> {
        let mut bridge = self.bridge.lock().await;

        // 1. Spawn the node process
        bridge.launch()?;

        // 2. Tell the bridge to open the browser (headless for automation runs)
        bridge
            .send_command("launch", serde_json::json!({ "headless": true }))
            .await
            .map_err(|e| format!("Failed to launch browser: {}", e))?;

        // 3. Navigate to the first step's URL
        let first_step_value = flow
            .steps
            .first()
            .and_then(|s| s.value.as_deref())
            .unwrap_or("/");
        let url = if target_base_url.starts_with("http") {
            format!(
                "{}{}",
                target_base_url.trim_end_matches('/'),
                first_step_value
            )
        } else {
            format!(
                "https://{}{}",
                target_base_url.trim_end_matches('/'),
                first_step_value
            )
        };

        bridge
            .send_command(
                "navigate",
                serde_json::json!({ "url": url, "waitUntil": "domcontentloaded" }),
            )
            .await
            .map_err(|e| format!("Failed to navigate: {}", e))?;

        let _ = app_handle.emit(
            "execution-log",
            StreamPayload {
                id: format!("log-{}", chrono::Utc::now().timestamp_millis()),
                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                level: "info".to_string(),
                message: format!("Navigated to {}", url),
            },
        );

        for (i, step) in flow.steps.iter().enumerate() {
            let _ = app_handle.emit(
                "step-update",
                serde_json::json!({ "stepIndex": i, "status": "running" }),
            );

            let _ = app_handle.emit(
                "execution-log",
                StreamPayload {
                    id: format!("log-step-{}", i),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    level: "info".to_string(),
                    message: format!(
                        "Executing: {} - {}",
                        step.command,
                        step.value.as_deref().unwrap_or("")
                    ),
                },
            );

            let step_result = match step.command.as_str() {
                "click" => {
                    let selector = self
                        .selector_engine
                        .resolve(step.target.as_ref(), step.value.as_deref())?;
                    bridge
                        .send_command("click", serde_json::json!({ "selector": selector }))
                        .await
                }
                "inputText" | "fill" => {
                    let selector = self
                        .selector_engine
                        .resolve(step.target.as_ref(), step.value.as_deref())?;
                    let text = step.value.as_deref().unwrap_or("");
                    bridge
                        .send_command(
                            "fill",
                            serde_json::json!({ "selector": selector, "text": text }),
                        )
                        .await
                }
                "navigate" => {
                    let path = step.value.as_deref().unwrap_or("/");
                    let full_url = if path.starts_with("http") {
                        path.to_string()
                    } else {
                        format!("{}{}", target_base_url.trim_end_matches('/'), path)
                    };
                    bridge
                        .send_command("navigate", serde_json::json!({ "url": full_url }))
                        .await
                }
                "assertVisible" => {
                    let selector = self
                        .selector_engine
                        .resolve(step.target.as_ref(), step.value.as_deref())
                        .unwrap_or_default();
                    bridge
                        .send_command(
                            "evaluate",
                            serde_json::json!({
                                "script": format!("document.querySelector('{}') !== null", selector.replace('\'', "\\\""))
                            }),
                        )
                        .await
                }
                _ => Ok(serde_json::Value::Null),
            };

            let (status, error_msg) = match step_result {
                Ok(_) => ("passed", None),
                Err(e) => ("failed", Some(e)),
            };

            tokio::time::sleep(tokio::time::Duration::from_millis(speed_ms)).await;

            let mut update = serde_json::json!({
                "stepIndex": i,
                "status": status,
                "durationMs": speed_ms,
            });
            if let Some(err) = &error_msg {
                update["errorMessage"] = serde_json::Value::String(err.clone());
            }
            let _ = app_handle.emit("step-update", update);

            let log_level = if status == "passed" {
                "assertion"
            } else {
                "error"
            };
            let log_msg = if let Some(err) = error_msg {
                format!("Step {} FAILED: {}", i + 1, err)
            } else {
                format!("Step {} PASSED", i + 1)
            };
            let _ = app_handle.emit(
                "execution-log",
                StreamPayload {
                    id: format!("log-pass-{}", i),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    level: log_level.to_string(),
                    message: log_msg,
                },
            );
        }

        let _ = app_handle.emit(
            "execution-log",
            StreamPayload {
                id: format!("log-complete-{}", chrono::Utc::now().timestamp_millis()),
                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                level: "info".to_string(),
                message: format!("Flow '{}' completed", flow.name),
            },
        );

        Ok(())
    }

    pub async fn close(&self) -> Result<(), String> {
        let bridge = self.bridge.lock().await;
        bridge.close()
    }
}
