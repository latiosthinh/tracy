pub mod agent_commands;
pub mod execution_commands;
pub mod file_commands;
pub mod project_commands;
pub mod webview_commands;

pub use agent_commands::*;
pub use execution_commands::*;
pub use file_commands::*;
pub use project_commands::*;
pub use webview_commands::*;

use crate::engine::ExecutionEngine;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct EngineState {
    pub engine: Arc<Mutex<ExecutionEngine>>,
}
