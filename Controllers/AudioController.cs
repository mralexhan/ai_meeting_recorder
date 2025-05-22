using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace MeetingRecorder.Controllers
{
    public class AudioController : ControllerBase
    {
        [HttpPost("upload")]
        public async Task<IActionResult> UploadAudio(IFormFile audio)
        {
            if (audio == null || audio.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            // Create a temporary file path for saving the uploaded audio
            var tempFilePath = Path.Combine(Directory.GetCurrentDirectory(), $"{DateTime.Now.Ticks}.mp3");

            // Save the uploaded audio file temporarily
            using (var fileStream = new FileStream(tempFilePath, FileMode.Create))
            {
                await audio.CopyToAsync(fileStream);
            }

            // Define the paths to Python executable and your script
            var pythonPath = Path.Combine(Directory.GetCurrentDirectory(), "Python", "venv", "Scripts", "python.exe");
            var scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Python", "whisper_access.py");

            // Define the process start info to run the Python script
            var startInfo = new ProcessStartInfo
            {
                FileName = pythonPath,  // Python executable inside the venv
                Arguments = $"\"{scriptPath}\" \"{tempFilePath}\"",  // Arguments: script path + the audio file path
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            string transcription = string.Empty;

            try
            {

                // Set environment variable to suppress warnings in the Python process
                startInfo.Environment["PYTHONWARNINGS"] = "ignore";
                
                // Start the process and capture the output from the Python script
                using var process = Process.Start(startInfo);
                using (var reader = process.StandardOutput)
                {
                    transcription = await reader.ReadToEndAsync();
                }

                // Capture any error from the Python script
                var error = await process.StandardError.ReadToEndAsync();
                if (!string.IsNullOrEmpty(error))
                {
                    return StatusCode(500, $"Python script error: {error}");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error executing Python script: {ex.Message}");
            }
            finally
            {
                // Clean up by deleting the temporary file after processing
                if (System.IO.File.Exists(tempFilePath))
                {
                    System.IO.File.Delete(tempFilePath);
                }
            }

            // Return the transcription result as a JSON response
            return Ok(new { transcription });
        }
    }
}
