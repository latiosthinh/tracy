pub mod ai;
pub mod engine;
pub mod ipc;
pub mod projects;

use engine::ExecutionEngine;
use ipc::{
    get_browser_dom_tree, get_browser_screenshot, launch_browser, navigate_browser, interact_browser, inspect_element_at_point,
    list_projects, load_dom_snapshots, load_project_from_disk, parse_yaml_flow,
    run_agent_cli_stream, run_flow, save_dom_snapshot, save_flow_to_disk, save_playwright_code,
    save_project, save_project_to_disk, scan_agent_clis, EngineState,
    open_child_webview, resize_child_webview, set_child_webview_visible, close_child_webview,
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine_state = EngineState {
        engine: Arc::new(Mutex::new(ExecutionEngine::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(engine_state)
        .invoke_handler(tauri::generate_handler![
            scan_agent_clis,
            run_agent_cli_stream,
            list_projects,
            save_project,
            parse_yaml_flow,
            run_flow,
            get_browser_screenshot,
            get_browser_dom_tree,
            inspect_element_at_point,
            launch_browser,
            navigate_browser,
            interact_browser,
            save_project_to_disk,
            load_project_from_disk,
            save_flow_to_disk,
            save_dom_snapshot,
            load_dom_snapshots,
            save_playwright_code,
            open_child_webview,
            resize_child_webview,
            set_child_webview_visible,
            close_child_webview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
