module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    config: grunt.file.readJSON('conf/env_config.json'),
    watch: {
      copy: {
        files: ['src/*.js'],
        tasks: ['copy']
      },
      eslint: {
        files: ['src/*.js'],
        tasks: ['eslint']
      }
    },
    copy: {
      main: {
        files: [
          { src: ['src/War_Base_Extended.user.js'], dest: '<%= config.outputDir %>/War_Base_Extended.user.js' }
        ]
      }
    },
    eslint: {
      options: {
        config: 'conf/eslint.json'
      },
      all: ['src/*.js']
    }
  });

  // load
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-eslint');

  // tasks
  grunt.registerTask('default', ['eslint', 'copy']);

};