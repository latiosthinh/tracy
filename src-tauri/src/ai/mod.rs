pub mod cli_scanner;

use cli_scanner::{AgentCliScanner, DetectedAgent};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowGenerationRequest {
    pub prompt: String,
    pub target_url: Option<String>,
    pub agent_id: Option<String>,
    pub api_key: Option<String>,
    pub selected_model: Option<String>,
    pub project_name: Option<String>,
}

pub struct AiManager;

impl AiManager {
    pub fn list_agents() -> Vec<DetectedAgent> {
        AgentCliScanner::scan()
    }
}
