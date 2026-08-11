use crate::ai::cli_scanner::{AgentCliScanner, DetectedAgent};
use tauri::AppHandle;

#[tauri::command]
pub fn scan_agent_clis() -> Vec<DetectedAgent> {
    AgentCliScanner::scan()
}

#[tauri::command]
pub async fn run_agent_cli_stream(
    app_handle: AppHandle,
    agent_id: String,
    prompt: String,
    system_instruction: Option<String>,
) -> Result<String, String> {
    let sys = system_instruction.unwrap_or_else(|| {
        "You are Tracy AI Copilot, an expert E2E web testing engineer. Output valid Tracy YAML test flow.".to_string()
    });
    AgentCliScanner::run_agent_stream(app_handle, agent_id, prompt, sys).await
}
