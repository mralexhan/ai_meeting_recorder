using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();
builder.Services.AddControllers();

var app = builder.Build();

app.UseDefaultFiles(); // Serves index.html by default
app.UseStaticFiles();  // Serves static files from wwwroot

app.MapControllers();

app.Run();