use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn save_project_to_disk(project_id: String, save_location: String, data: String) -> Result<String, String> {
    let base_path = PathBuf::from(save_location);
    let project_dir = base_path.join(&project_id);
    fs::create_dir_all(&project_dir).map_err(|e| format!("Failed to create project dir: {}", e))?;

    let file_path = project_dir.join("project.json");
    fs::write(&file_path, &data).map_err(|e| format!("Failed to write project data: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_project_from_disk(project_id: String, save_location: String) -> Result<String, String> {
    let file_path = PathBuf::from(&save_location).join(&project_id).join("project.json");
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read project data: {}", e))
}

#[tauri::command]
pub fn save_flow_to_disk(project_id: String, save_location: String, flow_name: String, yaml_content: String) -> Result<String, String> {
    let base_path = PathBuf::from(save_location);
    let flows_dir = base_path.join(&project_id).join("flows");
    fs::create_dir_all(&flows_dir).map_err(|e| format!("Failed to create flows dir: {}", e))?;

    let file_path = flows_dir.join(&flow_name);
    fs::write(&file_path, &yaml_content).map_err(|e| format!("Failed to write flow: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_dom_snapshot(project_id: String, save_location: String, page_path: String, snapshot_data: String) -> Result<String, String> {
    let base_path = PathBuf::from(save_location);
    let snapshots_dir = base_path.join(&project_id).join("dom-snapshots");
    fs::create_dir_all(&snapshots_dir).map_err(|e| format!("Failed to create snapshots dir: {}", e))?;

    let safe_path = page_path.replace('/', "_").replace('\\', "_");
    let file_path = snapshots_dir.join(format!("{}.json", safe_path));
    fs::write(&file_path, &snapshot_data).map_err(|e| format!("Failed to write snapshot: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_dom_snapshots(project_id: String, save_location: String) -> Result<Vec<(String, String)>, String> {
    let snapshots_dir = PathBuf::from(&save_location).join(&project_id).join("dom-snapshots");
    if !snapshots_dir.exists() {
        return Ok(vec![]);
    }

    let mut snapshots = vec![];
    for entry in fs::read_dir(&snapshots_dir).map_err(|e| format!("Failed to read snapshots dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "json") {
            let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read snapshot: {}", e))?;
            snapshots.push((name, content));
        }
    }

    Ok(snapshots)
}

#[tauri::command]
pub fn save_playwright_code(project_id: String, save_location: String, file_name: String, code: String) -> Result<String, String> {
    let base_path = PathBuf::from(save_location);
    let tests_dir = base_path.join(&project_id).join("tests");
    fs::create_dir_all(&tests_dir).map_err(|e| format!("Failed to create tests dir: {}", e))?;

    let file_path = tests_dir.join(&file_name);
    fs::write(&file_path, &code).map_err(|e| format!("Failed to write test code: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}
