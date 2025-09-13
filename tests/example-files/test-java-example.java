package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.ArrayList;

@SpringBootApplication
public class DemoApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
    
    @RestController
    @RequestMapping("/api")
    public class UserController {
        
        private final UserService userService;
        
        public UserController(UserService userService) {
            this.userService = userService;
        }
        
        @GetMapping("/users")
        public List<User> getAllUsers() {
            return userService.findAllUsers();
        }
        
        @PostMapping("/users")
        public User createUser(@RequestBody User user) {
            return userService.saveUser(user);
        }
    }
    
    @Service
    public class UserService {
        
        private List<User> users = new ArrayList<>();
        
        public List<User> findAllUsers() {
            return users;
        }
        
        public User saveUser(User user) {
            users.add(user);
            return user;
        }
        
        public User findUserById(Long id) {
            return users.stream()
                .filter(user -> user.getId().equals(id))
                .findFirst()
                .orElse(null);
        }
    }
    
    public class User {
        private Long id;
        private String name;
        private String email;
        
        // Constructors
        public User() {}
        
        public User(Long id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
        
        // Getters and Setters
        public Long getId() {
            return id;
        }
        
        public void setId(Long id) {
            this.id = id;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getEmail() {
            return email;
        }
        
        public void setEmail(String email) {
            this.email = email;
        }
    }
}