use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowMetadata {
    pub url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub browser: Option<String>,
    pub headless: Option<bool>,
    pub viewport: Option<ViewportConfig>,
    pub timeout: Option<u64>,
    pub retries: Option<u32>,
    pub video: Option<bool>,
    pub trace: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportConfig {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectorRule {
    #[serde(rename = "type")]
    pub selector_type: String,
    pub value: String,
    pub name: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowStep {
    pub id: String,
    pub command: String,
    pub target: Option<serde_json::Value>,
    pub value: Option<String>,
    pub args: Option<HashMap<String, serde_json::Value>>,
    pub timeout: Option<u64>,
    pub optional: Option<bool>,
    pub status: String, // "pending" | "running" | "passed" | "failed" | "skipped"
    #[serde(rename = "durationMs")]
    pub duration_ms: Option<u64>,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowFile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: Option<String>,
    #[serde(rename = "yamlContent")]
    pub yaml_content: String,
    pub metadata: FlowMetadata,
    pub steps: Vec<FlowStep>,
    pub tags: Vec<String>,
}

pub struct YamlParser;

impl YamlParser {
    /// Parse YAML content split by header and steps body (`---` delimiter)
    pub fn parse(yaml_str: &str, flow_id: &str, file_name: &str) -> Result<FlowFile, String> {
        let parts: Vec<&str> = yaml_str.split("---").collect();
        let (header_str, body_str) = if parts.len() >= 2 {
            (parts[0], parts[1])
        } else {
            ("", parts[0])
        };

        let metadata: FlowMetadata = serde_yaml::from_str(header_str).unwrap_or(FlowMetadata {
            url: None,
            tags: None,
            env: None,
            browser: None,
            headless: None,
            viewport: None,
            timeout: None,
            retries: None,
            video: None,
            trace: None,
        });

        // Parse steps array from body
        let parsed_yaml_body: Result<Vec<serde_json::Value>, _> = serde_yaml::from_str(body_str);
        let mut steps = Vec::new();

        if let Ok(yaml_steps) = parsed_yaml_body {
            for (idx, step_val) in yaml_steps.into_iter().enumerate() {
                if let serde_json::Value::Object(map) = step_val {
                    for (cmd_key, cmd_val) in map {
                        let step = FlowStep {
                            id: format!("{}-step-{}", flow_id, idx + 1),
                            command: cmd_key,
                            target: if cmd_val.is_object() || cmd_val.is_string() {
                                Some(cmd_val.clone())
                            } else {
                                None
                            },
                            value: if cmd_val.is_string() {
                                cmd_val.as_str().map(|s| s.to_string())
                            } else {
                                None
                            },
                            args: None,
                            timeout: None,
                            optional: None,
                            status: "pending".to_string(),
                            duration_ms: None,
                            error_message: None,
                        };
                        steps.push(step);
                    }
                }
            }
        }

        let tags = metadata.tags.clone().unwrap_or_default();

        Ok(FlowFile {
            id: flow_id.to_string(),
            name: file_name.to_string(),
            path: format!("flows/{}", file_name),
            category: Some("E2E".to_string()),
            yaml_content: yaml_str.to_string(),
            metadata,
            steps,
            tags,
        })
    }
}
