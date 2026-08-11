use crate::projects::yaml_parser::{FlowFile, YamlParser};
use crate::projects::{Project, ProjectStore};

#[tauri::command]
pub fn list_projects() -> Vec<Project> {
    ProjectStore::load_all()
}

#[tauri::command]
pub fn save_project(project: Project) -> Result<(), String> {
    ProjectStore::save(&project)
}

#[tauri::command]
pub fn parse_yaml_flow(yaml_content: String, flow_id: String, file_name: String) -> Result<FlowFile, String> {
    YamlParser::parse(&yaml_content, &flow_id, &file_name)
}
