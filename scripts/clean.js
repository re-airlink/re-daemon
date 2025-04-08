const { existsSync, mkdirSync, readdirSync, rmSync } = require('fs');

// Make sure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist');
}

// Clean all directories except storage
readdirSync('dist').forEach(dir => {
  if (dir !== 'storage') {
    rmSync(`dist/${dir}`, { recursive: true, force: true });
  }
});

console.log('Cleaned dist directory (preserved storage)'); 