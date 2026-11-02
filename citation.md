Citation Review - Word Add-in
A professional Microsoft Word add-in for validating, formatting, and managing citations in academic and research documents. Supports multiple citation styles including APA, MLA, Chicago, Harvard, and IEEE.

Features
🔍 Citation Analysis
Smart Detection: Automatically identifies citations in your document
Multi-Style Support: Works with APA, MLA, Chicago, Harvard, and IEEE formats
Issue Identification: Detects common citation problems and formatting errors
Reference Validation: Checks reference list completeness and formatting
✨ Citation Management
Quick Insertion: Add properly formatted citations with guided forms
Style Application: Convert between citation styles instantly
Bibliography Generation: Automatically create reference lists
Batch Formatting: Apply consistent formatting to all citations
🎯 Quality Assurance
Real-time Validation: Immediate feedback on citation quality
Visual Highlighting: Mark problematic citations for easy identification
Detailed Reports: Comprehensive analysis of citation issues
Auto-correction: Intelligent fixes for common formatting problems
Installation
Prerequisites
Microsoft Word 2016 or later (Windows/Mac)
Node.js 14.0 or later
npm 6.0 or later
Development Setup
Clone the repository

git clone https://github.com/citation-review/word-addin.git
cd citation-review-word-addin
Install dependencies

npm install
Install development certificates

npm run start
Sideload the add-in

Open Microsoft Word
Go to Insert > My Add-ins > Upload My Add-in
Select the manifest.xml file from the project root
Production Deployment
Build the add-in

npm run build
Deploy to web server

Upload the dist folder contents to your web server
Update the manifest.xml URLs to point to your server
Distribute the manifest.xml file to users
Usage
Getting Started
Open the Add-in

In Word, go to the Review tab
Click "Review Citations" to open the task pane
Scan Your Document

Click "Scan Citations" to analyze your document
Review the detected issues in the results panel
Fix Issues

Click "Fix" next to any identified problems
Use "Format All" to apply consistent styling
Citation Styles
The add-in supports the following citation styles:

APA 7th Edition: (Author, Year) format
MLA 9th Edition: (Author Page) format
Chicago 17th Edition: (Author Year) format
Harvard: (Author, Year) format
IEEE: [Number] format
Adding Citations
Manual Entry

Click "Add Citation"
Fill in the citation details form
Click "Insert Citation"
Quick Templates

Use the Quick Scan button in the ribbon
Insert citation templates at cursor position
Settings
Auto-format: Automatically apply formatting as you type
Highlight Issues: Visually mark problematic citations
Citation Style: Choose your preferred citation format
API Reference
Core Functions
scanCitations()
Analyzes the document for citations and identifies formatting issues.

await scanCitations();
validateCitation(citation, style)
Validates a single citation against style guidelines.

const issues = validateCitation("(Smith, 2024)", "apa");
formatCitation(data, style)
Formats citation data according to the specified style.

const formatted = formatCitation({
  author: "Smith",
  year: "2024"
}, "apa");
// Returns: "(Smith, 2024)"
Citation Patterns
The add-in uses regular expressions to identify citations:

const citationPatterns = {
  apa: {
    inText: /\([A-Za-z]+(?:,\s*[A-Za-z]+)*,?\s*\d{4}[a-z]?(?:,\s*p{1,2}\.\s*\d+(?:-\d+)?)?\)/g,
    reference: /^[A-Za-z]+,\s*[A-Z]\.\s*[A-Z]\.?\s*\(\d{4}\)\./gm
  }
  // ... other styles
};
Development
Project Structure
citation-review-addin/
├── src/
│   ├── taskpane.html      # Main UI
│   ├── taskpane.js        # Core functionality
│   ├── taskpane.css       # Styling
│   ├── commands.html      # Ribbon commands
│   └── commands.js        # Command handlers
├── tests/
│   ├── setup.js           # Test configuration
│   └── citation.test.js   # Unit tests
├── assets/                # Icons and images
├── dist/                  # Built files
├── manifest.xml           # Add-in manifest
├── package.json           # Dependencies
├── webpack.config.js      # Build configuration
└── README.md
Available Scripts
npm start - Start development server with hot reload
npm run build - Build for production
npm test - Run unit tests
npm run lint - Check code quality
npm run validate - Validate manifest file
Testing
Run the test suite:

npm test
Run tests with coverage:

npm test -- --coverage
Code Quality
The project uses ESLint for code quality:

npm run lint
Fix linting issues automatically:

npm run lint -- --fix
Contributing
Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request
Development Guidelines
Follow the existing code style and conventions
Write unit tests for new functionality
Update documentation for API changes
Ensure all tests pass before submitting PR
Troubleshooting
Common Issues
Add-in not loading

Verify manifest.xml URLs are accessible
Check browser console for JavaScript errors
Ensure certificates are properly installed
Citations not detected

Check if text contains proper citation format
Verify the selected citation style matches document format
Try refreshing the document scan
Formatting issues

Clear browser cache and reload add-in
Check for conflicting Word formatting
Verify citation style settings
Debug Mode
Enable debug logging:

localStorage.setItem('citation-debug', 'true');
View logs in browser developer tools console.

License
This project is licensed under the MIT License - see the LICENSE file for details.

Support
📧 Email: support@citation-review.com
🐛 Issues: GitHub Issues
📖 Documentation: Wiki
Changelog
Version 1.0.0
Initial release
APA, MLA, Chicago citation support
Basic validation and formatting
Task pane interface
Ribbon integration
