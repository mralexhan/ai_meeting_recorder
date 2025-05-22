//reference https://github.com/openai/openai-dotnet

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Identity;
using OpenAI.Chat;

namespace KeywordTag.Controllers 
{
    public class OpenAIController : ControllerBase //defines the class name and inherits from the ControllerBase class, which makes http requests possbile
    {

        private readonly PasswordHasher<string> _passwordHasher = new PasswordHasher<string>();
        private readonly string _storedHash;
        private readonly IConfiguration _configuration;

        public OpenAIController(IConfiguration configuration){
            _configuration = configuration; 

            // Manages storing the passwords with Azure Key Vaults
            // var keyVaultUrl = config["KeyVaultUrl"]; //insert Azure Key Vault URL via appsettings.json
            // var client = new SecretClient(new Uri(keyVaultUrl), new DefaultAzureCredential());

            // keyVaultSecret secret = client.GetSecret("StoredPasswordHash"); //retrieves the password from Azure Key Vault
            // _storedHash = secret.Value;

            //Manages storing password hash with Azure App Configuration
            _configuration = configuration;
            _storedHash = _configuration["PASSWORD_HASH"];
        }

        public class PromptRequest
        {
            public string Prompt { get; set; } = string.Empty;
            public string Pass { get; set; } = string.Empty;

            public string Service { get; set; } = string.Empty;
        }

        [HttpPost("openai/complete")]  // This directly tells the controller the route
        public async Task<IActionResult> PostHelloWorld([FromBody] PromptRequest request)  //function that defines what happens when API is called
        {
            //password things
            var userId = "dummyUser";
            var result = _passwordHasher.VerifyHashedPassword(userId, _storedHash, request.Pass);

            if (result == PasswordVerificationResult.Success)
            {
                string prompt = request.Prompt;
                string AIPrompt = string.Empty;
                
                if (prompt == "")
                { //checks if it is the original password check
                    return Ok(new { success = true });
                }
                else
                {
                    string? apikey = _configuration["OPENAI_API_KEY"];

                    if (string.IsNullOrEmpty(apikey))
                    {
                        return BadRequest("API key is missing from configuration.");
                    }

                    ChatClient client = new(
                        model: "gpt-4o-mini",
                        apiKey: apikey //puts openai api key from Azure environment variable.
                        );

                    if (request.Service == "record")
                    {
                        AIPrompt = $"Read through this meeting transcript thoroughly: {prompt}." +
                        "When you're finished, write out the meeting purpose, a list of key points from the meeting, and a list of action items" +
                        "Provide this information in a JSON file. The JSON file should look like:'{\"purpose\": \"\",\"key_points\": [{\"point_title\": \"\",\"points\": [\"\",\"\"]},{\"point_title\": \"\",\"points\": [\"\",\"\"]}],\"action_items\": [\"\", \"\"]}'";
                    }
                    else if (request.Service == "tag")
                    {
                        AIPrompt = $"Read through this text thoroughly: {prompt}." + 
                        "When you're finished, attach 5 tags that best reflect the contents of the text (ex. UI/UX Design, Financial Underwriting, Automation, etc). " +
                        "Also create a 100 word summary of the file that is clear and detailed" +
                        "Always respond in the same language as the provided text. Default to Chinese (Traditional) if unsure." + 
                        "Provide the tags and summary in a JSON file. The JSON file should look like:'{\"files\": [{\"tags\": [],\"summary\": \"\"},{\"tags\": [],\"summary\": \"\"}]}' ";
                    }

                    ChatCompletion completion = await client.CompleteChatAsync(AIPrompt);
                        

                    Console.WriteLine($"[ASSISTANT]: {completion.Content[0].Text}");
                    return Ok(new { message = $"{completion.Content[0].Text}", success = true });  // Send back a response
                }
            }
            else
            {
                return Ok(new { success = false, message = "Wrong Password!"});
            }
        }
    }
}
