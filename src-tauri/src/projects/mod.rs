pub mod yaml_parser;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use yaml_parser::{FlowFile, YamlParser};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub flows: Vec<String>,
    #[serde(rename = "testOutputDir")]
    pub test_output_dir: String,
    pub browser: String,
    pub headless: bool,
    pub viewport: ViewportSize,
    pub timeout: u64,
    pub retries: u32,
    #[serde(rename = "continueOnFailure")]
    pub continue_on_failure: bool,
    pub env: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "targetUrl")]
    pub target_url: String,
    pub environment: String,
    pub tags: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub flows: Vec<FlowFile>,
    #[serde(rename = "lastRunStatus")]
    pub last_run_status: Option<String>,
    #[serde(rename = "lastRunTime")]
    pub last_run_time: Option<String>,
    #[serde(rename = "passRate")]
    pub pass_rate: Option<u32>,
}

pub struct ProjectStore;

impl ProjectStore {
    /// Returns default projects if disk storage is empty
    pub fn get_default_projects() -> Vec<Project> {
        let checkout_yaml = r#"# E2E Checkout Flow — E-Commerce Cart & Order Confirmation
url: https://staging.shop.example.com
tags:
  - smoke
  - checkout
  - e2e
env:
  COUPON_CODE: SUMMER25
  TEST_EMAIL: alex.checkout@example.com
browser: chromium
viewport:
  width: 1280
  height: 720
timeout: 10000
retries: 2
---
# 1. Navigate to Store
- navigate: /products
- assertTitle: "Products - Tracy Shop"

# 2. Search for Product
- inputText:
    selector:
      placeholder: "Search products..."
    text: "Wireless Headphones"
- pressKey: Enter
- waitForNetwork: idle

# 3. Add item to cart
- click:
    testId: "add-cart-headphones"
- assertVisible:
    selector:
      testId: "cart-badge"
    text: "1"
"#;

        let flow1 = YamlParser::parse(checkout_yaml, "checkout-flow", "checkout-flow.yaml").unwrap();

        vec![Project {
            id: "proj-shop-staging".to_string(),
            name: "E-Commerce Storefront".to_string(),
            description: Some("End-to-end regression test suite for checkout, cart, product catalog, and responsive navigation.".to_string()),
            target_url: "https://staging.shop.example.com".to_string(),
            environment: "staging".to_string(),
            tags: vec!["e-commerce".to_string(), "checkout".to_string(), "critical-path".to_string()],
            created_at: "2026-08-01".to_string(),
            updated_at: "2026-08-08".to_string(),
            flows: vec![flow1],
            last_run_status: Some("PASSED".to_string()),
            last_run_time: Some("10 mins ago".to_string()),
            pass_rate: Some(100),
        }]
    }

    pub fn get_projects_dir() -> PathBuf {
        let base = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".to_string());
        let dir = Path::new(&base).join(".tracy").join("projects");
        let _ = fs::create_dir_all(&dir);
        dir
    }

    pub fn load_all() -> Vec<Project> {
        let dir = Self::get_projects_dir();
        let mut projects = Vec::new();

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(project) = serde_json::from_str::<Project>(&content) {
                            projects.push(project);
                        }
                    }
                }
            }
        }

        if projects.is_empty() {
            let defaults = Self::get_default_projects();
            for p in &defaults {
                let _ = Self::save(p);
            }
            return defaults;
        }

        projects
    }

    pub fn save(project: &Project) -> Result<(), String> {
        let dir = Self::get_projects_dir();
        let file_path = dir.join(format!("{}.json", project.id));
        let content = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
        fs::write(file_path, content).map_err(|e| e.to_string())
    }
}
