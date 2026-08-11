use super::EngineState;
use crate::projects::yaml_parser::FlowFile;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn run_flow(
    app_handle: AppHandle,
    state: State<'_, EngineState>,
    flow: FlowFile,
    target_base_url: String,
    speed_ms: Option<u64>,
) -> Result<(), String> {
    let speed = speed_ms.unwrap_or(600);
    let engine = state.engine.lock().await;
    engine.run_flow(app_handle, flow, target_base_url, speed).await
}

#[tauri::command]
pub async fn get_browser_screenshot(
    state: State<'_, EngineState>,
) -> Result<String, String> {
    let engine = state.engine.lock().await;
    engine.get_screenshot().await
}

#[tauri::command]
pub async fn get_browser_dom_tree(
    state: State<'_, EngineState>,
) -> Result<serde_json::Value, String> {
    let engine = state.engine.lock().await;
    engine.get_dom_tree().await
}

#[tauri::command]
pub async fn inspect_element_at_point(
    state: State<'_, EngineState>,
    x: f64,
    y: f64,
) -> Result<serde_json::Value, String> {
    let engine = state.engine.lock().await;
    engine.inspect_element_at_point(x, y).await
}

/// Launch the Playwright browser for the live preview panel.
/// headless=true → screenshot-only mode (embedded view)
#[tauri::command]
pub async fn launch_browser(
    state: State<'_, EngineState>,
    headless: Option<bool>,
) -> Result<(), String> {
    let engine = state.engine.lock().await;
    engine.launch_browser(headless.unwrap_or(true)).await
}

/// Navigate the live preview browser to `url` and return a base64 PNG screenshot + metadata.
#[tauri::command]
pub async fn navigate_browser(
    state: State<'_, EngineState>,
    url: String,
) -> Result<serde_json::Value, String> {
    let engine = state.engine.lock().await;
    engine.navigate_browser(url).await
}

#[tauri::command]
pub async fn interact_browser(
    state: State<'_, EngineState>,
    action: String,
    x: Option<f64>,
    y: Option<f64>,
    delta_x: Option<f64>,
    delta_y: Option<f64>,
    key: Option<String>,
) -> Result<serde_json::Value, String> {
    let engine = state.engine.lock().await;
    engine.interact_browser(action, x, y, delta_x, delta_y, key).await
}
