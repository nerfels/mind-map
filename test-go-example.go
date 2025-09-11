package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
	"gorm.io/driver/postgres"
)

// User represents a user in the system
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Email     string    `json:"email" gorm:"unique;not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserService handles business logic for users
type UserService struct {
	db    *gorm.DB
	redis *redis.Client
}

// UserController handles HTTP requests for users
type UserController struct {
	service *UserService
}

// UserRepository interface defines data access methods
type UserRepository interface {
	Create(user *User) error
	GetByID(id uint) (*User, error)
	GetAll() ([]User, error)
	Update(user *User) error
	Delete(id uint) error
}

// NewUserService creates a new UserService instance
func NewUserService(db *gorm.DB, redis *redis.Client) *UserService {
	return &UserService{
		db:    db,
		redis: redis,
	}
}

// NewUserController creates a new UserController instance
func NewUserController(service *UserService) *UserController {
	return &UserController{
		service: service,
	}
}

// Create creates a new user
func (s *UserService) Create(user *User) error {
	return s.db.Create(user).Error
}

// GetByID retrieves a user by ID
func (s *UserService) GetByID(id uint) (*User, error) {
	var user User
	err := s.db.First(&user, id).Error
	return &user, err
}

// GetAll retrieves all users
func (s *UserService) GetAll() ([]User, error) {
	var users []User
	err := s.db.Find(&users).Error
	return users, err
}

// Update updates a user
func (s *UserService) Update(user *User) error {
	return s.db.Save(user).Error
}

// Delete deletes a user by ID
func (s *UserService) Delete(id uint) error {
	return s.db.Delete(&User{}, id).Error
}

// CreateUser handles POST /users
func (c *UserController) CreateUser(ctx *gin.Context) {
	var user User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.service.Create(&user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	ctx.JSON(http.StatusCreated, user)
}

// GetUser handles GET /users/:id
func (c *UserController) GetUser(ctx *gin.Context) {
	var id uint
	if err := json.Unmarshal([]byte(ctx.Param("id")), &id); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := c.service.GetByID(id)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// GetAllUsers handles GET /users
func (c *UserController) GetAllUsers(ctx *gin.Context) {
	users, err := c.service.GetAll()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}

	ctx.JSON(http.StatusOK, users)
}

// UpdateUser handles PUT /users/:id
func (c *UserController) UpdateUser(ctx *gin.Context) {
	var id uint
	if err := json.Unmarshal([]byte(ctx.Param("id")), &id); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.ID = id
	if err := c.service.Update(&user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// DeleteUser handles DELETE /users/:id
func (c *UserController) DeleteUser(ctx *gin.Context) {
	var id uint
	if err := json.Unmarshal([]byte(ctx.Param("id")), &id); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := c.service.Delete(id); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// setupRoutes configures the HTTP routes
func setupRoutes(controller *UserController) *gin.Engine {
	router := gin.Default()

	api := router.Group("/api/v1")
	{
		api.POST("/users", controller.CreateUser)
		api.GET("/users/:id", controller.GetUser)
		api.GET("/users", controller.GetAllUsers)
		api.PUT("/users/:id", controller.UpdateUser)
		api.DELETE("/users/:id", controller.DeleteUser)
	}

	return router
}

// initDatabase initializes the database connection
func initDatabase() (*gorm.DB, error) {
	dsn := "host=localhost user=postgres password=postgres dbname=myapp port=5432 sslmode=disable"
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}

// initRedis initializes the Redis connection
func initRedis() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
	})
}

// main is the application entry point
func main() {
	// Initialize database
	db, err := initDatabase()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate the schema
	if err := db.AutoMigrate(&User{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize Redis
	redisClient := initRedis()

	// Initialize services and controllers
	userService := NewUserService(db, redisClient)
	userController := NewUserController(userService)

	// Setup routes
	router := setupRoutes(userController)

	// Start server
	fmt.Println("Server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}