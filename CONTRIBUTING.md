# Contributor's Guide

## Welcome! 👋

Thank you for your interest in contributing to the Smart Farming Project! We welcome contributions from developers, farmers, agricultural experts, and enthusiasts.

## 🎯 Ways to Contribute

### 1. Report Bugs
Found a bug? Please help us by [creating an issue](https://github.com/yourusername/smart-farming-project/issues).

**Include:**
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, ESP32 model, Node version)
- Screenshots if applicable

### 2. Add Features
Have an idea for a new feature? Open an issue first to discuss it with maintainers.

**Ideas we're looking for:**
- New sensor support
- Mobile app development
- Additional language support
- Cloud integration (AWS/Azure)
- Predictive analytics

### 3. Improve Documentation
Documentation improvements are always welcome!

- Fix typos
- Clarify instructions
- Add new tutorials
- Improve code comments

### 4. Test & Bug Fix
- Test the code in different environments
- Fix reported issues
- Optimize performance

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/smart-farming-project.git
cd smart-farming-project
```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming convention:**
- `feature/add-new-sensor` - for new features
- `fix/dht11-calibration` - for bug fixes
- `docs/update-readme` - for documentation
- `refactor/optimize-api` - for code improvements

### 4. Make Your Changes

- Follow the existing code style
- Add comments for complex logic
- Write tests if applicable
- Update documentation

### 5. Commit Your Changes

```bash
git commit -m "feat: Add new sensor support for EC meter

- Implement EC (Electrical Conductivity) sensor reading
- Add calibration procedure documentation
- Update hardware setup guide
- Add sample readings validation"
```

**Commit message format:**
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/dependency changes

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR description
5. Click "Create Pull Request"

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation is updated
- [ ] No console errors/warnings
- [ ] Commits are clean and well-documented
- [ ] PR description clearly explains changes
- [ ] Referenced any related issues

## 📖 Code Style Guide

### JavaScript/Node.js

```javascript
// Use const by default, let if needed
const SERVER_PORT = 3000;

// Use arrow functions for callbacks
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

// Use descriptive variable names
const sensorReadingInterval = 30000; // milliseconds

// Add JSDoc comments for functions
/**
 * Calculate soil moisture percentage
 * @param {number} rawValue - Raw ADC value from sensor (0-4095)
 * @returns {number} Moisture percentage (0-100)
 */
const calculateMoisture = (rawValue) => {
  return map(rawValue, 400, 800, 100, 0);
};
```

### Python

```python
# Follow PEP 8 style guide
# Use meaningful variable names
sensor_read_interval = 30  # seconds

# Type hints where possible
def read_temperature(pin: int) -> float:
    """
    Read temperature from DHT11 sensor.
    
    Args:
        pin: GPIO pin number
    
    Returns:
        Temperature in Celsius
    """
    # Implementation
    pass

# Use docstrings
class SensorData:
    """Container for sensor readings."""
    
    def __init__(self):
        self.temperature: float = 0.0
        self.humidity: float = 0.0
```

### Arduino/C++

```cpp
// Use CONSTANT_CASE for constants
const int DHT_PIN = 4;
const int SENSOR_READ_INTERVAL = 30000;

// Use descriptive function names
void readAllSensors() {
  // Implementation
}

// Add comments for complex logic
// Calibrated values for capacitive moisture sensor
// Dry soil: ~800, Wet soil: ~400
const int MOISTURE_DRY = 800;
const int MOISTURE_WET = 400;
```

## 🧪 Testing

### Running Tests

```bash
# Node.js
npm test

# Python
pytest
pytest --cov  # with coverage
```

### Writing Tests

**JavaScript:**
```javascript
describe('Sensor Data', () => {
  test('should read DHT11 temperature', async () => {
    const temp = await readTemperature();
    expect(temp).toBeGreaterThan(0);
    expect(temp).toBeLessThan(50);
  });
});
```

**Python:**
```python
def test_moisture_calculation():
    """Test moisture percentage calculation."""
    result = calculate_moisture(600)
    assert 0 <= result <= 100
```

## 🐛 Bug Report Template

```markdown
## Description
A clear description of what the bug is.

## Steps to Reproduce
1. Connect sensor X to GPIO Y
2. Upload code with settings Z
3. Open Serial Monitor
4. Observe the issue

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Windows 10 / Linux / macOS
- ESP32 Board: DevKit C / NodeMCU-32S / Other
- Arduino IDE Version: 2.0.0
- Library Versions: [relevant versions]

## Screenshots
If applicable, add screenshots

## Error Messages
Paste any console errors or Serial Monitor output
```

## 🌟 Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why would this feature be useful?

## Possible Implementation
How you think this could be implemented

## Additional Context
Any other information
```

## 📚 Documentation Style

### README Sections
- Clear overview with badges
- Feature list
- System architecture
- Hardware requirements
- Installation steps
- Configuration guide
- Usage examples
- Troubleshooting
- API documentation
- Contributing section

### Code Comments
- Explain the "why", not the "what"
- Use JSDoc/Docstring format
- Keep comments up-to-date
- Use TODO/FIXME for known issues

### Examples
```javascript
// ✓ Good comment - explains intent
// We multiply by 1.1 to account for voltage drop across the regulator
const voltage = reading * 1.1;

// ✗ Avoid - just restates code
// Multiply reading by 1.1
const voltage = reading * 1.1;
```

## 🤝 Community Guidelines

### Be Respectful
- No harassment, discrimination, or hate speech
- Be constructive in feedback
- Assume good intent

### Be Collaborative
- Share knowledge and help others
- Review PRs constructively
- Give credit where due

### Stay On Topic
- Keep discussions focused
- Search for similar issues first
- Provide relevant context

## 📞 Getting Help

- **Issues Tab**: Ask questions or report bugs
- **Discussions**: General questions and ideas
- **Email**: Contact maintainers
- **Discord/Slack**: (if community chat available)

## ✨ Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

---

## 🎓 Additional Resources

- [GitHub Guides](https://guides.github.com/)
- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Arduino Community](https://forum.arduino.cc/)

---

Thank you for contributing to make Smart Farming better! 🌾
