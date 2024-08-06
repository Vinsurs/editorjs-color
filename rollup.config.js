import { defineConfig } from "rollup"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"
import sass from "rollup-plugin-sass"
import clean from "rollup-plugin-clean2"
import dts from "rollup-plugin-dts"

export default defineConfig([
    {
        input: "src/index.ts",
        output: {
            dir: "dist",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            clean(),
            resolve(),
            commonjs(),
            typescript({
                rootDir: "src",
            }),
            sass({ output: "dist/style.css", options: { outputStyle: "compressed" } }),
            terser(),
        ]
    },
    {
        input: "src/index.ts",
        output: { file: "dist/index.d.ts", format: "es" },
        plugins: [sass(), dts()],
    }
])
