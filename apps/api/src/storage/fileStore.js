import { mkdir, readFile, writeFile, rename } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

// Resolve data directory relative to this file's location
// fileStore.js is at: apps/api/src/storage/fileStore.js
// data directory is at: apps/api/data/
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
// On Vercel, the path structure might be different - try multiple locations
let defaultDataDirectory = path.resolve(moduleDirectory, "../../data");
// Fallback: try from process.cwd() if the relative path doesn't work
if (process.env.VERCEL) {
  // On Vercel, try from the API root
  const vercelDataDir = path.resolve(process.cwd(), "data");
  // Check if this path exists (will be checked at runtime)
  defaultDataDirectory = vercelDataDir;
}

function resolveDataDirectory(input) {
  if (!input) {
    return defaultDataDirectory;
  }

  if (path.isAbsolute(input)) {
    return input;
  }

  return path.resolve(process.cwd(), input);
}

const dataDirectory = resolveDataDirectory(process.env.DATA_DIRECTORY);

async function ensureDirectory() {
  await mkdir(dataDirectory, { recursive: true });
}

export async function readJson(fileName, defaultValue) {
  await ensureDirectory();
  const filePath = path.join(dataDirectory, fileName);

  try {
    const raw = await readFile(filePath, "utf-8");
    try {
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`Failed to parse JSON file ${filePath}:`, error.message);
        // On Vercel, can't write backup, just return default
        if (process.env.VERCEL) {
          return JSON.parse(JSON.stringify(defaultValue));
        }
        await backupCorruptedFile(filePath, raw);
        await writeJson(fileName, defaultValue);
        return JSON.parse(JSON.stringify(defaultValue));
      }
      throw error;
    }
  } catch (error) {
    // Log the error for debugging
    console.error(`Failed to read file ${filePath}:`, error.message);
    console.error(`Data directory: ${dataDirectory}`);
    console.error(`File path: ${filePath}`);
    console.error(`Process cwd: ${process.cwd()}`);
    console.error(`Module directory: ${moduleDirectory}`);
    
    // On Vercel, try alternative paths
    if (process.env.VERCEL && error.code === "ENOENT") {
      // Try alternative path from process.cwd()
      const altPath = path.resolve(process.cwd(), "data", fileName);
      console.log(`Trying alternative path: ${altPath}`);
      try {
        const raw = await readFile(altPath, "utf-8");
        return JSON.parse(raw);
      } catch (altError) {
        console.warn(`Alternative path also failed: ${altError.message}`);
        console.warn(`File ${fileName} not found on Vercel, returning default. Make sure the file is committed to git.`);
        return JSON.parse(JSON.stringify(defaultValue));
      }
    }
    
    if (error.code === "ENOENT") {
      await writeJson(fileName, defaultValue);
      return JSON.parse(JSON.stringify(defaultValue));
    }

    throw error;
  }
}

export async function writeJson(fileName, value) {
  // On Vercel, filesystem is read-only - can't write files
  // Config file is deployed from git, so writes will fail gracefully
  if (process.env.VERCEL) {
    const error = new Error(`Cannot write to filesystem on Vercel. Update ${fileName} in git and redeploy.`);
    error.code = 'EROFS';
    throw error;
  }

  await ensureDirectory();
  const filePath = path.join(dataDirectory, fileName);
  const serialized = JSON.stringify(value, null, 2);
  const tempFilePath = path.join(
    dataDirectory,
    `${fileName}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  );

  await writeFile(tempFilePath, `${serialized}\n`, "utf-8");
  await rename(tempFilePath, filePath);
}

async function backupCorruptedFile(filePath, raw) {
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);
  const dirName = path.dirname(filePath);
  const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `${baseName}.corrupted-${timeStamp}${extension || ".json"}`;
  const backupPath = path.join(dirName, backupName);

  await writeFile(backupPath, raw, "utf-8");
}


