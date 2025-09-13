use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};
use actix_web::{web, App, HttpResponse, HttpServer, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
}

pub trait UserRepository {
    type Error;
    
    async fn create_user(&self, request: CreateUserRequest) -> Result<User, Self::Error>;
    async fn find_user(&self, id: u64) -> Result<Option<User>, Self::Error>;
    async fn list_users(&self) -> Result<Vec<User>, Self::Error>;
}

pub struct InMemoryUserRepository {
    users: HashMap<u64, User>,
    next_id: u64,
}

impl InMemoryUserRepository {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
            next_id: 1,
        }
    }

    pub async fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize with some test data
        self.create_user(CreateUserRequest {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
        }).await?;
        
        Ok(())
    }
}

impl UserRepository for InMemoryUserRepository {
    type Error = Box<dyn std::error::Error>;

    async fn create_user(&self, request: CreateUserRequest) -> Result<User, Self::Error> {
        let user = User {
            id: self.next_id,
            name: request.name,
            email: request.email,
            created_at: chrono::Utc::now(),
        };
        
        // In a real implementation, we'd need interior mutability
        // self.users.insert(user.id, user.clone());
        // self.next_id += 1;
        
        Ok(user)
    }

    async fn find_user(&self, id: u64) -> Result<Option<User>, Self::Error> {
        Ok(self.users.get(&id).cloned())
    }

    async fn list_users(&self) -> Result<Vec<User>, Self::Error> {
        Ok(self.users.values().cloned().collect())
    }
}

#[derive(Clone)]
pub struct AppState {
    pub user_repo: std::sync::Arc<dyn UserRepository<Error = Box<dyn std::error::Error>> + Send + Sync>,
}

pub async fn create_user_handler(
    state: web::Data<AppState>,
    req: web::Json<CreateUserRequest>,
) -> Result<HttpResponse> {
    match state.user_repo.create_user(req.into_inner()).await {
        Ok(user) => Ok(HttpResponse::Created().json(user)),
        Err(err) => {
            eprintln!("Failed to create user: {}", err);
            Ok(HttpResponse::InternalServerError().json("Failed to create user"))
        }
    }
}

pub async fn get_user_handler(
    state: web::Data<AppState>,
    path: web::Path<u64>,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    
    match state.user_repo.find_user(user_id).await {
        Ok(Some(user)) => Ok(HttpResponse::Ok().json(user)),
        Ok(None) => Ok(HttpResponse::NotFound().json("User not found")),
        Err(err) => {
            eprintln!("Failed to fetch user: {}", err);
            Ok(HttpResponse::InternalServerError().json("Failed to fetch user"))
        }
    }
}

pub async fn list_users_handler(
    state: web::Data<AppState>,
) -> Result<HttpResponse> {
    match state.user_repo.list_users().await {
        Ok(users) => Ok(HttpResponse::Ok().json(users)),
        Err(err) => {
            eprintln!("Failed to list users: {}", err);
            Ok(HttpResponse::InternalServerError().json("Failed to list users"))
        }
    }
}

macro_rules! log_request {
    ($method:expr, $path:expr) => {
        println!("Request: {} {}", $method, $path);
    };
}

pub mod config {
    use serde::Deserialize;

    #[derive(Debug, Deserialize)]
    pub struct ServerConfig {
        pub host: String,
        pub port: u16,
        pub workers: usize,
    }

    impl Default for ServerConfig {
        fn default() -> Self {
            Self {
                host: "127.0.0.1".to_string(),
                port: 8080,
                workers: num_cpus::get(),
            }
        }
    }

    pub fn load_config() -> Result<ServerConfig, config::ConfigError> {
        // In a real app, this would load from environment/config files
        Ok(ServerConfig::default())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    let config = config::load_config()?;
    
    let mut user_repo = InMemoryUserRepository::new();
    user_repo.initialize().await?;
    
    let app_state = AppState {
        user_repo: std::sync::Arc::new(user_repo),
    };

    log_request!("Starting", "server");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .route("/users", web::post().to(create_user_handler))
            .route("/users", web::get().to(list_users_handler))
            .route("/users/{id}", web::get().to(get_user_handler))
    })
    .bind(format!("{}:{}", config.host, config.port))?
    .workers(config.workers)
    .run()
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_user_creation() {
        let repo = InMemoryUserRepository::new();
        let request = CreateUserRequest {
            name: "Test User".to_string(),
            email: "test@example.com".to_string(),
        };

        let user = repo.create_user(request).await.unwrap();
        assert_eq!(user.name, "Test User");
        assert_eq!(user.email, "test@example.com");
    }

    #[tokio::test]
    async fn test_user_repository_trait() {
        let repo = InMemoryUserRepository::new();
        
        // Test that we can use the trait methods
        let users = repo.list_users().await.unwrap();
        assert!(users.is_empty());
    }
}