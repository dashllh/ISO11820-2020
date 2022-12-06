using Microsoft.Extensions.Logging.EventLog;
using Microsoft.EntityFrameworkCore;
using TestServer.Services;
using TestServer.Models;
using TestServer.Hubs;
using TestServer.Core;
using TestServer.Global;

//设置ContentRoot路径以便WindowsService正常启动
WebApplicationOptions options = new()
{
    ContentRootPath = AppContext.BaseDirectory,
    Args = args
};

var builder = WebApplication.CreateBuilder(args);

// 注册SignalR服务对象
builder.Services.AddSignalR();
// 注册客户端访问控制器服务对象
builder.Services.AddControllers();
// 注册数据库上下文工厂服务对象
//builder.Services.AddDbContextFactory<TestDBContext>(opt =>
//    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddDbContextFactory<ISO11820DbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("ISO11820")));

//添加应用程序全局存储对象
builder.Services.AddSingleton<AppGlobal>();
//注册试验传感器容器对象
builder.Services.AddSingleton<SensorDictionary>();
//注册试验传感器数据采集服务
builder.Services.AddHostedService<DAQService>();
//注册试验控制器对象
builder.Services.AddSingleton<TestMaster1>();
builder.Services.AddSingleton<TestMaster2>();
builder.Services.AddSingleton<TestMaster3>();
builder.Services.AddSingleton<TestMaster4>();
//注册试验控制器容器对象
builder.Services.AddSingleton<TestMasters>();

//配置Windows日志记录器显示信息
builder.Services.Configure<EventLogSettings>(config =>
{
    config.LogName = string.Empty;
    config.SourceName = "DAQService";
});

var app = builder.Build();

// Configure the HTTP request pipeline.
//if (!app.Environment.IsDevelopment())
//{
//    app.UseExceptionHandler("/Error");
//    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
//    app.UseHsts();
//}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.MapControllers();

app.MapHub<NotificationHub>("/Notify");

app.Run();
