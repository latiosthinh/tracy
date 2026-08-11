pub struct SelectorEngine;

impl SelectorEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn resolve(&self, target: Option<&serde_json::Value>, value: Option<&str>) -> Result<String, String> {
        if let Some(t) = target {
            if let Some(obj) = t.as_object() {
                if let Some(test_id) = obj.get("testId").and_then(|v| v.as_str()) {
                    return Ok(format!("[data-testid=\"{}\"]", test_id));
                }
                if let Some(id) = obj.get("id").and_then(|v| v.as_str()) {
                    return Ok(format!("#{}", id));
                }
                if let Some(css) = obj.get("css").and_then(|v| v.as_str()) {
                    return Ok(css.to_string());
                }
                if let Some(role) = obj.get("role").and_then(|v| v.as_str()) {
                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        return Ok(format!("role={}[name=\"{}\"]", role, name));
                    }
                }
            }
            if let Some(text) = t.as_str() {
                return Ok(format!("text=\"{}\"", text));
            }
        }
        if let Some(v) = value {
            return Ok(format!("text=\"{}\"", v));
        }
        Err("No valid selector found".to_string())
    }
}
