const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Generates a preset index for a given repository
 * @param {string} repoPath - Path to the repository root
 * @param {string} outputPath - Optional custom output path for index file
 */
function generatePresetIndex(repoPath, outputPath = null) {
  console.log(`Starting preset indexing in: ${repoPath}`);
  
  const presets = [];

  /**
   * Find preset-config.yaml files in presets directory
   * @param {string} presetsDir - Directory containing preset folders
   */
  function findPresetConfigs(presetsDir) {
    console.log(`Searching for presets in: ${presetsDir}`);
    
    try {
      // Ensure presets directory exists
      if (!fs.existsSync(presetsDir)) {
        console.error(`Presets directory not found: ${presetsDir}`);
        return;
      }

      // Get all subdirectories in the presets folder
      const presetFolders = fs.readdirSync(presetsDir)
        .filter(file => 
          fs.statSync(path.join(presetsDir, file)).isDirectory()
        );

      console.log(`Found ${presetFolders.length} potential preset folders`);

      presetFolders.forEach(presetFolder => {
        const fullPresetPath = path.join(presetsDir, presetFolder);
        const configPath = path.join(fullPresetPath, 'preset-config.yaml');

        try {
          // Check if preset-config.yaml exists
          if (fs.existsSync(configPath)) {
            try {
              // Read and parse the preset configuration
              const presetConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
              
              // Validate preset configuration
              if (!presetConfig || typeof presetConfig !== 'object') {
                console.warn(`Invalid preset configuration in: ${configPath}`);
                return;
              }
              
              // Extract relevant metadata with fallback values
              const preset = {
                name: presetConfig.name || presetFolder,
                path: path.relative(repoPath, fullPresetPath),
                category: presetConfig.category || 'Uncategorized',
                author: presetConfig.author || 'Unknown',
                description: presetConfig.description || '',
                tags: Array.isArray(presetConfig.tags) ? presetConfig.tags : [],
                status: presetConfig.status || 'Draft',
                files: presetConfig.files || {},
                additional_files: Array.isArray(presetConfig.additional_files) ? presetConfig.additional_files : []

              };
              
              console.log(`Found preset: ${preset.name} at ${preset.path}`);
              presets.push(preset);
            } catch (parseError) {
              console.error(`Error parsing ${configPath}:`, parseError);
            }
          } else {
            console.log(`No preset-config.yaml found in: ${fullPresetPath}`);
          }
        } catch (error) {
          console.error(`Error processing preset folder ${fullPresetPath}:`, error);
        }
      });
    } catch (error) {
      console.error(`Error searching for presets in ${presetsDir}:`, error);
    }
  }

  // Start searching for preset configs in the presets directory
  const presetsDir = path.join(repoPath, 'presets');
  findPresetConfigs(presetsDir);

  // Determine output path (use provided or default to repo root)
  const indexPath = outputPath || path.join(repoPath, 'PRESET_INDEX.yaml');

  // Generate index file
  const indexContent = {
    version: 1,
    last_updated: new Date().toISOString(),
    total_presets: presets.length,
    presets: presets
  };

  // Write index file
  try {
    fs.writeFileSync(indexPath, yaml.dump(indexContent));
    console.log(`Generated preset index with ${presets.length} presets`);
    console.log(`Index saved to: ${indexPath}`);
  } catch (writeError) {
    console.error('Error writing index file:', writeError);
  }

  return indexContent;
}

/**
 * Validate the generated index
 * @param {string} repoPath - Path to the repository root
 * @param {string} indexPath - Path to the generated index file
 */
function validatePresetIndex(repoPath, indexPath = null) {
  const defaultIndexPath = path.join(repoPath, 'PRESET_INDEX.yaml');
  const targetIndexPath = indexPath || defaultIndexPath;

  try {
    // Read the index file
    const indexContent = yaml.load(fs.readFileSync(targetIndexPath, 'utf8'));

    // Perform validations
    if (!indexContent.version) {
      throw new Error('Missing index version');
    }

    if (!indexContent.presets || !Array.isArray(indexContent.presets)) {
      throw new Error('Invalid presets section');
    }

    // Validate each preset
    indexContent.presets.forEach(preset => {
      if (!preset.name) {
        throw new Error(`Preset missing name: ${JSON.stringify(preset)}`);
      }

      // Verify preset path exists
      const presetPath = path.join(repoPath, preset.path, 'preset-config.yaml');
      if (!fs.existsSync(presetPath)) {
        throw new Error(`Preset configuration not found: ${presetPath}`);
      }
    });

    console.log('Preset index validation successful');
    return true;
  } catch (error) {
    console.error('Preset index validation failed:', error);
    return false;
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  const repoPath = process.argv[2] || process.cwd();
  generatePresetIndex(repoPath);
  validatePresetIndex(repoPath);
}

module.exports = {
  generatePresetIndex,
  validatePresetIndex
};
