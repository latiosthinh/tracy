use tauri::{AppHandle, Manager, LogicalPosition, LogicalSize, WebviewUrl};
use tauri::webview::WebviewBuilder;

#[tauri::command]
pub async fn open_child_webview(
    app: AppHandle,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    // Check if it already exists
    if let Some(webview) = app.get_webview("child-browser") {
        let _ = webview.set_position(LogicalPosition::new(x, y));
        let _ = webview.set_size(LogicalSize::new(width, height));
        // Use javascript to navigate
        let _ = webview.eval(&format!("window.location.replace('{}')", url));
        let _ = webview.show();
    } else {
        // Create new child webview
        let window = app.get_window("main").ok_or("Main window not found")?;
        let parsed_url = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;
        
        window.add_child(
            WebviewBuilder::new("child-browser", WebviewUrl::External(parsed_url)),
            LogicalPosition::new(x, y),
            LogicalSize::new(width, height),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_child_webview(
    app: AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(webview) = app.get_webview("child-browser") {
        let _ = webview.set_position(LogicalPosition::new(x, y));
        let _ = webview.set_size(LogicalSize::new(width, height));
    }
    Ok(())
}

#[tauri::command]
pub async fn set_child_webview_visible(
    app: AppHandle,
    visible: bool,
) -> Result<(), String> {
    if let Some(webview) = app.get_webview("child-browser") {
        if visible {
            let _ = webview.show();
        } else {
            let _ = webview.hide();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn close_child_webview(
    app: AppHandle,
) -> Result<(), String> {
    if let Some(webview) = app.get_webview("child-browser") {
        let _ = webview.close();
    }
    Ok(())
}
