/**
 * TreeSitterQueries - Predefined Query Patterns
 *
 * S-expression query patterns for extracting common code structures
 * from Tree-sitter ASTs across multiple languages.
 *
 * Queries follow Tree-sitter query syntax:
 * https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries
 */

import { SupportedLanguage } from './TreeSitterParser.js';

/**
 * Query pattern definitions
 */
export interface QueryPattern {
  name: string;
  pattern: string;
  description: string;
}

/**
 * Language-specific query patterns
 */
export class TreeSitterQueries {
  /**
   * TypeScript/JavaScript query patterns
   */
  static readonly TYPESCRIPT_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_declaration
          name: (identifier) @function-name
          parameters: (formal_parameters) @parameters
          body: (statement_block) @body) @function

        (method_definition
          name: (property_identifier) @function-name
          parameters: (formal_parameters) @parameters
          body: (statement_block) @body) @function

        (arrow_function
          parameters: (formal_parameters)? @parameters
          body: (_) @body) @function
      `,
      description: 'Extract all function declarations, methods, and arrow functions'
    },

    CLASSES: {
      name: 'classes',
      pattern: `
        (class_declaration
          name: (type_identifier) @class-name
          body: (class_body) @body) @class
      `,
      description: 'Extract all class declarations'
    },

    IMPORTS: {
      name: 'imports',
      pattern: `
        (import_statement
          source: (string) @source) @import
      `,
      description: 'Extract all import statements'
    },

    EXPORTS: {
      name: 'exports',
      pattern: `
        (export_statement) @export
      `,
      description: 'Extract all export statements'
    },

    INTERFACES: {
      name: 'interfaces',
      pattern: `
        (interface_declaration
          name: (type_identifier) @interface-name
          body: (object_type) @body) @interface
      `,
      description: 'Extract all interface declarations'
    },

    TYPE_ALIASES: {
      name: 'type-aliases',
      pattern: `
        (type_alias_declaration
          name: (type_identifier) @type-name
          value: (_) @type-value) @type-alias
      `,
      description: 'Extract all type alias declarations'
    }
  };

  /**
   * Python query patterns
   */
  static readonly PYTHON_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_definition
          name: (identifier) @function-name
          parameters: (parameters) @parameters
          body: (block) @body) @function
      `,
      description: 'Extract all function definitions'
    },

    CLASSES: {
      name: 'classes',
      pattern: `
        (class_definition
          name: (identifier) @class-name
          body: (block) @body) @class
      `,
      description: 'Extract all class definitions'
    },

    IMPORTS: {
      name: 'imports',
      pattern: `
        (import_statement
          name: (dotted_name) @module) @import

        (import_from_statement
          module_name: (dotted_name) @module) @import
      `,
      description: 'Extract all import statements'
    },

    DECORATORS: {
      name: 'decorators',
      pattern: `
        (decorator) @decorator
      `,
      description: 'Extract all decorators'
    }
  };

  /**
   * Java query patterns
   */
  static readonly JAVA_QUERIES: Record<string, QueryPattern> = {
    CLASSES: {
      name: 'classes',
      pattern: `
        (class_declaration
          name: (identifier) @class-name
          body: (class_body) @body) @class
      `,
      description: 'Extract all class declarations'
    },

    METHODS: {
      name: 'methods',
      pattern: `
        (method_declaration
          name: (identifier) @method-name
          parameters: (formal_parameters) @parameters
          body: (block) @body) @method
      `,
      description: 'Extract all method declarations'
    },

    INTERFACES: {
      name: 'interfaces',
      pattern: `
        (interface_declaration
          name: (identifier) @interface-name
          body: (interface_body) @body) @interface
      `,
      description: 'Extract all interface declarations'
    },

    IMPORTS: {
      name: 'imports',
      pattern: `
        (import_declaration) @import
      `,
      description: 'Extract all import declarations'
    },

    ANNOTATIONS: {
      name: 'annotations',
      pattern: `
        (annotation) @annotation
      `,
      description: 'Extract all annotations'
    }
  };

  /**
   * Go query patterns
   */
  static readonly GO_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_declaration
          name: (identifier) @function-name
          parameters: (parameter_list) @parameters
          body: (block) @body) @function
      `,
      description: 'Extract all function declarations'
    },

    METHODS: {
      name: 'methods',
      pattern: `
        (method_declaration
          receiver: (parameter_list) @receiver
          name: (field_identifier) @method-name
          parameters: (parameter_list) @parameters
          body: (block) @body) @method
      `,
      description: 'Extract all method declarations'
    },

    STRUCTS: {
      name: 'structs',
      pattern: `
        (type_declaration
          (type_spec
            name: (type_identifier) @struct-name
            type: (struct_type) @struct-body)) @struct
      `,
      description: 'Extract all struct declarations'
    },

    INTERFACES: {
      name: 'interfaces',
      pattern: `
        (type_declaration
          (type_spec
            name: (type_identifier) @interface-name
            type: (interface_type) @interface-body)) @interface
      `,
      description: 'Extract all interface declarations'
    },

    IMPORTS: {
      name: 'imports',
      pattern: `
        (import_declaration) @import
      `,
      description: 'Extract all import declarations'
    }
  };

  /**
   * Rust query patterns
   */
  static readonly RUST_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_item
          name: (identifier) @function-name
          parameters: (parameters) @parameters
          body: (block) @body) @function
      `,
      description: 'Extract all function items'
    },

    STRUCTS: {
      name: 'structs',
      pattern: `
        (struct_item
          name: (type_identifier) @struct-name
          body: (field_declaration_list)? @fields) @struct
      `,
      description: 'Extract all struct items'
    },

    TRAITS: {
      name: 'traits',
      pattern: `
        (trait_item
          name: (type_identifier) @trait-name
          body: (declaration_list) @body) @trait
      `,
      description: 'Extract all trait items'
    },

    IMPLS: {
      name: 'implementations',
      pattern: `
        (impl_item
          type: (type_identifier) @type-name
          body: (declaration_list) @body) @impl
      `,
      description: 'Extract all impl blocks'
    },

    USE_DECLARATIONS: {
      name: 'use-declarations',
      pattern: `
        (use_declaration) @use
      `,
      description: 'Extract all use declarations'
    }
  };

  /**
   * C++ query patterns
   */
  static readonly CPP_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_definition
          declarator: (function_declarator
            declarator: (identifier) @function-name
            parameters: (parameter_list) @parameters)
          body: (compound_statement) @body) @function
      `,
      description: 'Extract all function definitions'
    },

    CLASSES: {
      name: 'classes',
      pattern: `
        (class_specifier
          name: (type_identifier) @class-name
          body: (field_declaration_list) @body) @class
      `,
      description: 'Extract all class definitions'
    },

    NAMESPACES: {
      name: 'namespaces',
      pattern: `
        (namespace_definition
          name: (identifier) @namespace-name
          body: (declaration_list) @body) @namespace
      `,
      description: 'Extract all namespace definitions'
    }
  };

  /**
   * C# query patterns
   */
  static readonly CSHARP_QUERIES: Record<string, QueryPattern> = {
    CLASSES: {
      name: 'classes',
      pattern: `
        (class_declaration
          name: (identifier) @class-name
          body: (declaration_list) @body) @class
      `,
      description: 'Extract all class declarations'
    },

    METHODS: {
      name: 'methods',
      pattern: `
        (method_declaration
          name: (identifier) @method-name
          parameters: (parameter_list) @parameters
          body: (block) @body) @method
      `,
      description: 'Extract all method declarations'
    },

    INTERFACES: {
      name: 'interfaces',
      pattern: `
        (interface_declaration
          name: (identifier) @interface-name
          body: (declaration_list) @body) @interface
      `,
      description: 'Extract all interface declarations'
    },

    NAMESPACES: {
      name: 'namespaces',
      pattern: `
        (namespace_declaration
          name: (identifier) @namespace-name
          body: (declaration_list) @body) @namespace
      `,
      description: 'Extract all namespace declarations'
    }
  };

  /**
   * PHP query patterns
   */
  static readonly PHP_QUERIES: Record<string, QueryPattern> = {
    FUNCTIONS: {
      name: 'functions',
      pattern: `
        (function_definition
          name: (name) @function-name
          parameters: (formal_parameters) @parameters
          body: (compound_statement) @body) @function
      `,
      description: 'Extract all function definitions'
    },

    CLASSES: {
      name: 'classes',
      pattern: `
        (class_declaration
          name: (name) @class-name
          body: (declaration_list) @body) @class
      `,
      description: 'Extract all class declarations'
    },

    METHODS: {
      name: 'methods',
      pattern: `
        (method_declaration
          name: (name) @method-name
          parameters: (formal_parameters) @parameters
          body: (compound_statement) @body) @method
      `,
      description: 'Extract all method declarations'
    },

    TRAITS: {
      name: 'traits',
      pattern: `
        (trait_declaration
          name: (name) @trait-name
          body: (declaration_list) @body) @trait
      `,
      description: 'Extract all trait declarations'
    }
  };

  /**
   * Ruby query patterns
   */
  static readonly RUBY_QUERIES: Record<string, QueryPattern> = {
    METHODS: {
      name: 'methods',
      pattern: `
        (method
          name: (identifier) @method-name
          parameters: (method_parameters)? @parameters
          body: (_)* @body) @method
      `,
      description: 'Extract all method definitions'
    },

    CLASSES: {
      name: 'classes',
      pattern: `
        (class
          name: (constant) @class-name
          body: (_)* @body) @class
      `,
      description: 'Extract all class definitions'
    },

    MODULES: {
      name: 'modules',
      pattern: `
        (module
          name: (constant) @module-name
          body: (_)* @body) @module
      `,
      description: 'Extract all module definitions'
    }
  };

  /**
   * Get queries for a specific language
   */
  static getQueriesForLanguage(
    language: SupportedLanguage
  ): Record<string, QueryPattern> {
    switch (language) {
      case SupportedLanguage.TYPESCRIPT:
      case SupportedLanguage.JAVASCRIPT:
        return this.TYPESCRIPT_QUERIES;
      case SupportedLanguage.PYTHON:
        return this.PYTHON_QUERIES;
      case SupportedLanguage.JAVA:
        return this.JAVA_QUERIES;
      case SupportedLanguage.GO:
        return this.GO_QUERIES;
      case SupportedLanguage.RUST:
        return this.RUST_QUERIES;
      case SupportedLanguage.CPP:
        return this.CPP_QUERIES;
      case SupportedLanguage.CSHARP:
        return this.CSHARP_QUERIES;
      case SupportedLanguage.PHP:
        return this.PHP_QUERIES;
      case SupportedLanguage.RUBY:
        return this.RUBY_QUERIES;
      default:
        return {};
    }
  }

  /**
   * Get a specific query pattern
   */
  static getQuery(
    language: SupportedLanguage,
    queryName: string
  ): QueryPattern | null {
    const queries = this.getQueriesForLanguage(language);
    return queries[queryName.toUpperCase()] || null;
  }

  /**
   * Get all available query names for a language
   */
  static getAvailableQueries(language: SupportedLanguage): string[] {
    const queries = this.getQueriesForLanguage(language);
    return Object.keys(queries).map(k => k.toLowerCase());
  }
}
