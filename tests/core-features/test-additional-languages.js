#!/usr/bin/env node

/**
 * Additional Languages Test Suite
 *
 * Tests the 6 new language analyzers:
 * - PHP (Laravel, Symfony, WordPress frameworks)
 * - C# (ASP.NET, WPF, Unity frameworks)
 * - Ruby (Rails, Sinatra frameworks)
 * - Swift (UIKit, SwiftUI frameworks)
 * - Kotlin (Android, Compose frameworks)
 * - Scala (Akka, Play frameworks)
 */

import { PhpAnalyzer } from '../../dist/core/PhpAnalyzer.js';
import { CSharpAnalyzer } from '../../dist/core/CSharpAnalyzer.js';
import { RubyAnalyzer } from '../../dist/core/RubyAnalyzer.js';
import { SwiftAnalyzer } from '../../dist/core/SwiftAnalyzer.js';
import { KotlinAnalyzer } from '../../dist/core/KotlinAnalyzer.js';
import { ScalaAnalyzer } from '../../dist/core/ScalaAnalyzer.js';

class AdditionalLanguagesTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      const startTime = Date.now();

      await testFn();

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', duration });

    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async testPhpAnalyzer() {
    const analyzer = new PhpAnalyzer();

    const phpCode = `<?php
namespace App\\Controllers;

use Illuminate\\Http\\Request;
use App\\Models\\User;

class UserController extends Controller
{
    private $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(Request $request): JsonResponse
    {
        $users = User::all();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email'
        ]);

        $user = User::create($data);
        return response()->json($user, 201);
    }
}

function helper_function($param) {
    return "Helper: " . $param;
}
`;

    const result = await analyzer.analyzeFile('/test/UserController.php', phpCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify file node
    const fileNode = result.nodes.find(n => n.type === 'file');
    if (!fileNode || fileNode.metadata.language !== 'php') {
      throw new Error('PHP file node not found or incorrect language');
    }

    // Verify class node
    const classNode = result.nodes.find(n => n.type === 'class' && n.name === 'UserController');
    if (!classNode) {
      throw new Error('UserController class not found');
    }

    // Verify methods
    const methods = result.nodes.filter(n => n.type === 'function' && n.metadata.functionType === 'method');
    if (methods.length < 3) { // __construct, index, store
      throw new Error(`Expected at least 3 methods, found ${methods.length}`);
    }

    // Verify framework detection
    const frameworkNodes = result.nodes.filter(n => n.type === 'pattern' && n.metadata.framework);
    const hasLaravel = frameworkNodes.some(n => n.metadata.framework === 'laravel');
    if (!hasLaravel) {
      console.warn('   ⚠️  Laravel framework not detected (expected from Illuminate imports)');
    }

    // Verify imports
    const importNodes = result.nodes.filter(n => n.metadata.type === 'import');
    if (importNodes.length < 2) {
      throw new Error(`Expected at least 2 imports, found ${importNodes.length}`);
    }

    console.log(`   ✓ PHP analysis complete: ${methods.length} methods, ${importNodes.length} imports`);
  }

  async testCSharpAnalyzer() {
    const analyzer = new CSharpAnalyzer();

    const csharpCode = `using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MyApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ILogger<UsersController> _logger;
        private readonly IUserService _userService;

        public UsersController(ILogger<UsersController> logger, IUserService userService)
        {
            _logger = logger;
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] UserDto userDto)
        {
            var user = await _userService.CreateAsync(userDto);
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
    }

    public interface IUserService
    {
        Task<IEnumerable<User>> GetAllAsync();
        Task<User> CreateAsync(UserDto dto);
    }
}`;

    const result = await analyzer.analyzeFile('/test/UsersController.cs', csharpCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify file node
    const fileNode = result.nodes.find(n => n.type === 'file');
    if (!fileNode || fileNode.metadata.language !== 'csharp') {
      throw new Error('C# file node not found or incorrect language');
    }

    // Verify class and interface nodes
    const classNodes = result.nodes.filter(n => n.type === 'class');
    const controllerClass = classNodes.find(n => n.name === 'UsersController');
    const serviceInterface = classNodes.find(n => n.name === 'IUserService');

    if (!controllerClass) {
      throw new Error('UsersController class not found');
    }
    if (!serviceInterface) {
      throw new Error('IUserService interface not found');
    }

    // Verify methods
    const methods = result.nodes.filter(n => n.type === 'function');
    if (methods.length < 3) {
      throw new Error(`Expected at least 3 methods, found ${methods.length}`);
    }

    // Verify ASP.NET Core framework detection
    const frameworkNodes = result.nodes.filter(n => n.metadata.framework === 'aspnet_core');
    if (frameworkNodes.length === 0) {
      console.warn('   ⚠️  ASP.NET Core framework not detected');
    }

    console.log(`   ✓ C# analysis complete: ${classNodes.length} types, ${methods.length} methods`);
  }

  async testRubyAnalyzer() {
    const analyzer = new RubyAnalyzer();

    const rubyCode = `require 'rails'

class UsersController < ApplicationController
  before_action :authenticate_user!

  def index
    @users = User.all
    render json: @users
  end

  def show
    @user = User.find(params[:id])
    render json: @user
  end

  def create
    @user = User.new(user_params)

    if @user.save
      render json: @user, status: :created
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email)
  end
end

class User < ApplicationRecord
  validates :name, presence: true
  validates :email, presence: true, uniqueness: true

  def full_name
    "#{first_name} #{last_name}"
  end
end

def helper_method(param)
  "Helper: #{param}"
end`;

    const result = await analyzer.analyzeFile('/test/users_controller.rb', rubyCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify classes
    const classNodes = result.nodes.filter(n => n.type === 'class');
    const controllerClass = classNodes.find(n => n.name === 'UsersController');
    const modelClass = classNodes.find(n => n.name === 'User');

    if (!controllerClass) {
      throw new Error('UsersController class not found');
    }
    if (!modelClass) {
      throw new Error('User model class not found');
    }

    // Verify methods
    const methods = result.nodes.filter(n => n.type === 'function');
    if (methods.length < 5) {
      throw new Error(`Expected at least 5 methods, found ${methods.length}`);
    }

    // Verify Rails framework detection
    const railsFramework = result.nodes.find(n => n.metadata.framework === 'rails');
    if (!railsFramework) {
      console.warn('   ⚠️  Rails framework not detected');
    }

    console.log(`   ✓ Ruby analysis complete: ${classNodes.length} classes, ${methods.length} methods`);
  }

  async testSwiftAnalyzer() {
    const analyzer = new SwiftAnalyzer();

    const swiftCode = `import UIKit
import SwiftUI

class ViewController: UIViewController {
    @IBOutlet weak var titleLabel: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadData()
    }

    private func setupUI() {
        titleLabel.text = "Welcome"
        titleLabel.textColor = .systemBlue
    }

    private func loadData() {
        // Load data implementation
    }
}

struct ContentView: View {
    @State private var name: String = ""
    @State private var isPresented: Bool = false

    var body: some View {
        NavigationView {
            VStack {
                TextField("Enter name", text: $name)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                Button("Show Alert") {
                    isPresented = true
                }
                .alert("Hello", isPresented: $isPresented) {
                    Button("OK") { }
                }
            }
            .navigationTitle("SwiftUI Demo")
        }
    }
}

func globalHelper(_ value: String) -> String {
    return "Processed: \\(value)"
}`;

    const result = await analyzer.analyzeFile('/test/ViewController.swift', swiftCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify types
    const typeNodes = result.nodes.filter(n => n.type === 'class');
    const viewController = typeNodes.find(n => n.name === 'ViewController');
    const contentView = typeNodes.find(n => n.name === 'ContentView');

    if (!viewController) {
      throw new Error('ViewController class not found');
    }
    if (!contentView) {
      throw new Error('ContentView struct not found');
    }

    // Verify methods
    const methods = result.nodes.filter(n => n.type === 'function');
    if (methods.length < 4) {
      throw new Error(`Expected at least 4 methods, found ${methods.length}`);
    }

    // Verify framework detection
    const uikitFramework = result.nodes.find(n => n.metadata.framework === 'uikit');
    const swiftuiFramework = result.nodes.find(n => n.metadata.framework === 'swiftui');

    if (!uikitFramework) {
      console.warn('   ⚠️  UIKit framework not detected');
    }
    if (!swiftuiFramework) {
      console.warn('   ⚠️  SwiftUI framework not detected');
    }

    console.log(`   ✓ Swift analysis complete: ${typeNodes.length} types, ${methods.length} methods`);
  }

  async testKotlinAnalyzer() {
    const analyzer = new KotlinAnalyzer();

    const kotlinCode = `package com.example.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyAppTheme {
                HomeScreen()
            }
        }
    }
}

@Composable
fun HomeScreen() {
    var text by remember { mutableStateOf("") }

    Column {
        TextField(
            value = text,
            onValueChange = { text = it },
            label = { Text("Enter text") }
        )

        Button(
            onClick = {
                // Handle click
            }
        ) {
            Text("Submit")
        }
    }
}

class UserRepository {

    suspend fun getUsers(): List<User> {
        // Suspend function for coroutines
        return emptyList()
    }

    fun saveUser(user: User): Boolean {
        return true
    }
}

data class User(
    val id: Int,
    val name: String,
    val email: String
)

fun topLevelFunction(param: String): String {
    return "Processed: $param"
}`;

    const result = await analyzer.analyzeFile('/test/MainActivity.kt', kotlinCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify types
    const typeNodes = result.nodes.filter(n => n.type === 'class');
    console.log(`   🔍 Found types: ${typeNodes.map(n => `${n.name}(${n.metadata.classType})`).join(', ')}`);

    const activity = typeNodes.find(n => n.name === 'MainActivity');
    const repository = typeNodes.find(n => n.name === 'UserRepository');
    const dataClass = typeNodes.find(n => n.name === 'User');

    if (!activity) {
      throw new Error('MainActivity class not found');
    }
    if (!repository) {
      throw new Error('UserRepository class not found');
    }
    if (!dataClass) {
      throw new Error('User data class not found');
    }

    // Verify functions
    const functions = result.nodes.filter(n => n.type === 'function');
    console.log(`   🔍 Found functions: ${functions.map(f => f.name).join(', ')}`);
    if (functions.length < 5) {
      throw new Error(`Expected at least 5 functions, found ${functions.length}`);
    }

    // Verify Android/Compose framework detection
    const androidFramework = result.nodes.find(n => n.metadata.framework === 'android');
    const composeFramework = result.nodes.find(n => n.metadata.framework === 'compose');

    if (!androidFramework) {
      console.warn('   ⚠️  Android framework not detected');
    }
    if (!composeFramework) {
      console.warn('   ⚠️  Compose framework not detected');
    }

    console.log(`   ✓ Kotlin analysis complete: ${typeNodes.length} types, ${functions.length} functions`);
  }

  async testScalaAnalyzer() {
    const analyzer = new ScalaAnalyzer();

    const scalaCode = `package com.example.app

import akka.actor.{Actor, ActorSystem, Props}
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._

case class User(id: Int, name: String, email: String)

class UserActor extends Actor {

  def receive: Receive = {
    case GetUser(id) =>
      sender() ! User(id, "John", "john@example.com")
    case CreateUser(name, email) =>
      val user = User(1, name, email)
      sender() ! user
  }
}

object UserActor {
  def props(): Props = Props(new UserActor())

  case class GetUser(id: Int)
  case class CreateUser(name: String, email: String)
}

trait UserService {
  def findUser(id: Int): Option[User]
  def createUser(name: String, email: String): User
}

class UserServiceImpl extends UserService {

  override def findUser(id: Int): Option[User] = {
    Some(User(id, "Test User", "test@example.com"))
  }

  override def createUser(name: String, email: String): User = {
    User(1, name, email)
  }
}

object WebServer {

  def routes: Route = {
    path("users" / IntNumber) { userId =>
      get {
        complete(s"User $userId")
      }
    } ~
    path("users") {
      post {
        complete("User created")
      }
    }
  }

  def main(args: Array[String]): Unit = {
    implicit val system = ActorSystem("user-system")

    Http().newServerAt("localhost", 8080).bind(routes)
    println("Server started at http://localhost:8080")
  }
}

def helperFunction(value: String): String = {
  s"Processed: $value"
}`;

    const result = await analyzer.analyzeFile('/test/UserService.scala', scalaCode);

    console.log(`   📊 Found ${result.nodes.length} nodes, ${result.edges.length} edges`);

    // Verify types
    const typeNodes = result.nodes.filter(n => n.type === 'class');
    console.log(`   🔍 Found types: ${typeNodes.map(n => `${n.name}(${n.metadata.classType})`).join(', ')}`);

    const caseClass = typeNodes.find(n => n.name === 'User');
    const actorClass = typeNodes.find(n => n.name === 'UserActor');
    const trait = typeNodes.find(n => n.name === 'UserService');
    const serviceImpl = typeNodes.find(n => n.name === 'UserServiceImpl');

    if (!caseClass) {
      throw new Error('User case class not found');
    }
    if (!actorClass) {
      throw new Error('UserActor class not found');
    }
    if (!trait) {
      throw new Error('UserService trait not found');
    }
    if (!serviceImpl) {
      throw new Error('UserServiceImpl class not found');
    }

    // Verify methods
    const methods = result.nodes.filter(n => n.type === 'function');
    if (methods.length < 6) {
      throw new Error(`Expected at least 6 methods, found ${methods.length}`);
    }

    // Verify Akka framework detection
    const akkaFramework = result.nodes.find(n => n.metadata.framework === 'akka');
    if (!akkaFramework) {
      console.warn('   ⚠️  Akka framework not detected');
    }

    console.log(`   ✓ Scala analysis complete: ${typeNodes.length} types, ${methods.length} methods`);
  }

  async runAllTests() {
    console.log('🧪 Starting Additional Languages Test Suite\n');

    await this.runTest('PHP Analyzer', () => this.testPhpAnalyzer());
    await this.runTest('C# Analyzer', () => this.testCSharpAnalyzer());
    await this.runTest('Ruby Analyzer', () => this.testRubyAnalyzer());
    await this.runTest('Swift Analyzer', () => this.testSwiftAnalyzer());
    await this.runTest('Kotlin Analyzer', () => this.testKotlinAnalyzer());
    await this.runTest('Scala Analyzer', () => this.testScalaAnalyzer());

    this.printResults();
  }

  printResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🌍 Additional Languages Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new AdditionalLanguagesTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { AdditionalLanguagesTestSuite };