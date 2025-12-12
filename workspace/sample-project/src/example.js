console.log('Hello from Algo Code Editor!');

function greet(name) {
  return `Welcome, ${name}!`;
}

// Example JavaScript file with syntax highlighting
const editor = {
  name: 'Algo',
  features: [
    'Syntax highlighting',
    'Code completion',
    'Multi-cursor editing',
    'Integrated terminal',
    'Git integration'
  ],
  
  start() {
    console.log(greet('Developer'));
    console.log('Features:', this.features.join(', '));
  }
};

editor.start();
