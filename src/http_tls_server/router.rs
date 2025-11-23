//! Pluggable Service Router
//!
//! Allows different services to register their routes in a modular way.

use axum::{Router, handler::Handler, routing::MethodRouter};
use std::collections::HashMap;
use tower_http::services::ServeDir;

/// Service router for registering routes under a base path
#[derive(Clone)]
pub struct ServiceRouter {
    base_path: String,
    routes: HashMap<String, MethodRouter>,
    nested_routers: Vec<(String, ServiceRouter)>,
    static_dirs: Vec<(String, String)>,
}

impl ServiceRouter {
    /// Create a new service router with a base path
    pub fn new(base_path: impl Into<String>) -> Self {
        Self {
            base_path: base_path.into().trim_end_matches('/').to_string(),
            routes: HashMap::new(),
            nested_routers: Vec::new(),
            static_dirs: Vec::new(),
        }
    }

    /// Add a route under this service's base path
    pub fn route(mut self, path: impl Into<String>, method_router: MethodRouter) -> Self {
        self.routes.insert(path.into(), method_router);
        self
    }

    /// Add a GET route
    pub fn get<H, T>(self, path: impl Into<String>, handler: H) -> Self
    where
        H: Handler<T, ()>,
        T: 'static,
    {
        self.route(path, axum::routing::get(handler))
    }

    /// Add a POST route
    pub fn post<H, T>(self, path: impl Into<String>, handler: H) -> Self
    where
        H: Handler<T, ()>,
        T: 'static,
    {
        self.route(path, axum::routing::post(handler))
    }

    /// Add a PUT route
    pub fn put<H, T>(self, path: impl Into<String>, handler: H) -> Self
    where
        H: Handler<T, ()>,
        T: 'static,
    {
        self.route(path, axum::routing::put(handler))
    }

    /// Add a DELETE route
    pub fn delete<H, T>(self, path: impl Into<String>, handler: H) -> Self
    where
        H: Handler<T, ()>,
        T: 'static,
    {
        self.route(path, axum::routing::delete(handler))
    }

    /// Add a nested router under a sub-path
    pub fn nest(mut self, path: impl Into<String>, router: ServiceRouter) -> Self {
        self.nested_routers.push((path.into(), router));
        self
    }

    /// Add static file serving under a path
    pub fn static_dir(mut self, path: impl Into<String>, dir: impl Into<String>) -> Self {
        self.static_dirs.push((path.into(), dir.into()));
        self
    }

    /// Build the router for this service
    pub fn build(self) -> Router {
        let mut router = Router::new();

        // Add individual routes
        for (path, method_router) in self.routes {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            router = router.route(&full_path, method_router);
        }

        // Add nested routers
        for (path, nested_router) in self.nested_routers {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            let nested_axum_router = nested_router.build();
            router = router.nest(&full_path, nested_axum_router);
        }

        // Add static directories
        for (path, dir) in self.static_dirs {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            router = router.nest_service(&full_path, ServeDir::new(dir));
        }

        router
    }

    /// Get the base path for this service
    pub fn base_path(&self) -> &str {
        &self.base_path
    }

    /// Get all registered routes for introspection
    pub fn routes(&self) -> Vec<String> {
        let mut routes = Vec::new();

        for path in self.routes.keys() {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            routes.push(full_path);
        }

        for (path, nested_router) in &self.nested_routers {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            routes.push(format!("{}/* (nested)", full_path));
        }

        for (path, _) in &self.static_dirs {
            let full_path = if path.starts_with('/') {
                format!("{}{}", self.base_path, path)
            } else {
                format!("{}/{}", self.base_path, path)
            };
            routes.push(format!("{}/* (static)", full_path));
        }

        routes
    }
}

/// Router registry for managing multiple service routers
#[derive(Clone)]
pub struct RouterRegistry {
    services: HashMap<String, ServiceRouter>,
}

impl RouterRegistry {
    pub fn new() -> Self {
        Self {
            services: HashMap::new(),
        }
    }

    /// Register a service router
    pub fn register_service(&mut self, name: impl Into<String>, router: ServiceRouter) {
        self.services.insert(name.into(), router);
    }

    /// Unregister a service router
    pub fn unregister_service(&mut self, name: &str) {
        self.services.remove(name);
    }

    /// Get a service router by name
    pub fn get_service(&self, name: &str) -> Option<&ServiceRouter> {
        self.services.get(name)
    }

    /// Build the complete router with all registered services
    pub fn build_complete_router(self) -> Router {
        let mut router = Router::new();

        for service_router in self.services.into_values() {
            let service_axum_router = service_router.build();
            router = router.merge(service_axum_router);
        }

        router
    }

    /// Get all registered service names
    pub fn service_names(&self) -> Vec<String> {
        self.services.keys().cloned().collect()
    }

    /// Get all routes across all services for introspection
    pub fn all_routes(&self) -> HashMap<String, Vec<String>> {
        self.services.iter()
            .map(|(name, router)| (name.clone(), router.routes()))
            .collect()
    }
}

impl Default for RouterRegistry {
    fn default() -> Self {
        Self::new()
    }
}
