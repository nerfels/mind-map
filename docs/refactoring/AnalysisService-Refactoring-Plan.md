# AnalysisService Refactoring Plan

## Problem Statement

**AnalysisService.ts**: 2991 lines - God Object anti-pattern
- Violates Single Responsibility Principle
- Hard to maintain, test, and extend
- Multiple unrelated responsibilities in one class

## Current Responsibilities (from code analysis)

1. **Architectural Analysis** (~200 lines)
   - analyzeArchitecture()
   - getArchitecturalInsights()

2. **Call Pattern Analysis** (~400 lines)
   - analyzeCallPatterns()
   - getCallPatternStatistics()

3. **API Detection** (~500 lines)
   - detectCrossLanguageAPIs()
   - REST, GraphQL, gRPC, WebSocket, WebAssembly detection

4. **Test Coverage Mapping** (~400 lines)
   - analyzeTestCoverage()
   - Test-to-implementation file mapping

5. **Configuration Analysis** (~500 lines)
   - analyzeConfigurationRelationships()
   - Dependency trees, configuration files

6. **Error Propagation** (~500 lines)
   - analyzeErrorPropagation()
   - Error flows, unhandled paths, vulnerability detection

7. **Error Prediction** (~300 lines)
   - predictErrors()
   - Risk assessment

8. **Fix Suggestions** (~200 lines)
   - suggestFixes()
   - Historical fix analysis

## Proposed Split: 4 Focused Services

### 1. **ASTAnalysisService** (~800 lines)
**Responsibility**: Code structure and AST-level analysis

**Methods**:
- analyzeArchitecture()
- getArchitecturalInsights()
- analyzeCallPatterns()
- getCallPatternStatistics()
- detectDesignPatterns()

**Dependencies**:
- MindMapStorage
- ArchitecturalAnalyzer
- CallPatternAnalyzer

**Rationale**: Groups AST-level code structure analysis

---

### 2. **FrameworkDetectionService** (~600 lines)
**Responsibility**: Framework, tooling, and API detection

**Methods**:
- detectCrossLanguageAPIs()
- detectRESTEndpoints()
- detectGraphQL()
- detectGRPC()
- detectWebSocket()
- detectWebAssembly()
- detectFrameworks()
- detectTooling()

**Dependencies**:
- MindMapStorage
- MultiLanguageIntelligence
- LanguageToolingDetector
- EnhancedFrameworkDetector

**Rationale**: All external technology detection in one place

---

### 3. **DependencyAnalysisService** (~900 lines)
**Responsibility**: Dependencies, relationships, and configuration

**Methods**:
- analyzeTestCoverage()
- analyzeConfigurationRelationships()
- buildDependencyTree()
- detectOrphanedConfigs()
- analyzeConfigurationFiles()
- mapTestToImplementation()

**Dependencies**:
- MindMapStorage

**Rationale**: All relationship and dependency tracking

---

### 4. **CodeQualityService** (~700 lines)
**Responsibility**: Code quality, errors, and metrics

**Methods**:
- predictErrors()
- analyzeErrorPropagation()
- suggestFixes()
- getRiskAssessment()
- analyzeErrorFlows()
- detectVulnerableAreas()

**Dependencies**:
- MindMapStorage

**Rationale**: Quality, safety, and error analysis

---

## Migration Strategy

### Phase 1: Create Service Interfaces
1. Define interfaces for each service
2. Create empty service classes with method stubs
3. Update type definitions

### Phase 2: Extract Methods
1. Copy methods to new services (maintain originals)
2. Update method signatures if needed
3. Ensure all dependencies are injected

### Phase 3: Update AnalysisService
1. Keep AnalysisService as coordinator
2. Delegate to new services
3. Maintain backward compatibility

### Phase 4: Update Callers
1. Update MindMapEngine to inject new services
2. Update handlers to use specific services
3. Remove delegation layer if desired

### Phase 5: Remove Old Code
1. Remove duplicated methods from AnalysisService
2. Keep AnalysisService as thin coordinator (or remove entirely)
3. Update tests

## File Structure

```
src/core/services/
├── AnalysisService.ts (coordinator - 200 lines)
├── analysis/
│   ├── ASTAnalysisService.ts (~800 lines)
│   ├── FrameworkDetectionService.ts (~600 lines)
│   ├── DependencyAnalysisService.ts (~900 lines)
│   └── CodeQualityService.ts (~700 lines)
└── types/
    ├── AnalysisTypes.ts (shared types)
    └── index.ts
```

## Benefits

✅ **Single Responsibility** - Each service has one clear purpose
✅ **Easier Testing** - Test services in isolation
✅ **Better Maintainability** - Smaller, focused files
✅ **Improved Performance** - Load only what you need
✅ **Scalability** - Easy to add new analysis types
✅ **Team Collaboration** - Multiple developers can work without conflicts

## Implementation Order

1. ✅ Create directory structure
2. ✅ Extract shared types to AnalysisTypes.ts
3. ✅ Create ASTAnalysisService
4. ✅ Create FrameworkDetectionService
5. ✅ Create DependencyAnalysisService
6. ✅ Create CodeQualityService
7. ✅ Update AnalysisService to delegate
8. ✅ Update MindMapEngine
9. ✅ Test all services
10. ✅ Remove old code

## Backward Compatibility

During migration, AnalysisService will act as a facade:

```typescript
export class AnalysisService {
  constructor(
    private astAnalysis: ASTAnalysisService,
    private frameworkDetection: FrameworkDetectionService,
    private dependencyAnalysis: DependencyAnalysisService,
    private codeQuality: CodeQualityService
  ) {}

  // Delegate to new services
  async analyzeArchitecture(...args) {
    return this.astAnalysis.analyzeArchitecture(...args);
  }

  async detectCrossLanguageAPIs(...args) {
    return this.frameworkDetection.detectCrossLanguageAPIs(...args);
  }

  // ... etc
}
```

## Success Metrics

- AnalysisService: 2991 → 200 lines (93% reduction)
- New services: 4 focused classes averaging ~750 lines each
- All existing tests pass
- No breaking changes to API
- Better type safety
- Improved code coverage

## Timeline

- Estimated effort: 1-2 days
- Low risk (maintains backward compatibility)
- High impact (better architecture)

---

**Status**: Ready to implement
**Next**: Create shared types and service skeletons
