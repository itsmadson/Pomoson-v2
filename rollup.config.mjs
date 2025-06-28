import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import terser  from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import { spawn } from 'child_process';

const production = !process.env.ROLLUP_WATCH;

function serve() {
    let server;
    
    function toExit() {
        if (server) server.kill(0);
    }
    
    return {
        writeBundle() {
            if (server) return;
            server = spawn('npm', ['run', 'start', '--', '--dev'], {
                stdio: ['ignore', 'inherit', 'inherit'],
                shell: true
            });
            
            process.on('SIGTERM', toExit);
            process.on('exit', toExit);
        }
    };
}

export default {
    input: './src/main.js',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: 'public/build/bundle.js'
    },
    plugins: [
        svelte({
            compilerOptions: {
                dev: !production,
                hydratable: true
            },
            emitCss: true
        }),
        css({ output: 'bundle.css' }),
        resolve({
            browser: true,
            dedupe: ['svelte'],
            exportConditions: ['svelte']
        }),
        commonjs(),
        !production && serve(),
        !production && livereload({
            watch: 'public',
            clientUrl: process.env.ROLLUP_WATCH 
                ? 'http://localhost:35729/livereload.js?snipver=1'
                : undefined,
            port: 35729
        }),
        production && terser()
    ],
    watch: {
        clearScreen: false,
        chokidar: {
            usePolling: true
        }
    },
    onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
    }
};