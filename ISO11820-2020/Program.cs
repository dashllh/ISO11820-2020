using Microsoft.Extensions.Logging.EventLog;
using Microsoft.EntityFrameworkCore;
using TestServer.Services;
using TestServer.Models;
using TestServer.Hubs;
using TestServer.Core;
using TestServer.Global;
using ISO11820_2020.Hubs;
using Microsoft.Extensions.Hosting.WindowsServices;

//����ContentRoot·���Ա�WindowsService��������
WebApplicationOptions options = new()
{
    Args = args,
    ContentRootPath = WindowsServiceHelpers.IsWindowsService() ? AppContext.BaseDirectory : default    
};

var builder = WebApplication.CreateBuilder(args);

/* ================= ��DI������ע��������� =================== */

// ע��SignalR�������
builder.Services.AddSignalR();
// ע��ͻ��˷��ʿ������������
builder.Services.AddControllers();
// ע�����ݿ������Ĺ����������
//builder.Services.AddDbContextFactory<TestDBContext>(opt =>
//    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddDbContextFactory<ISO11820DbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("ISO11820")));
//���Ӧ�ó���ȫ�ִ洢����
builder.Services.AddSingleton<AppGlobal>();
//ע�����鴫������������
builder.Services.AddSingleton<SensorDictionary>();
//ע�����鴫�������ݲɼ�����
builder.Services.AddHostedService<DAQService>();
//ע���������������
builder.Services.AddSingleton<TestMaster1>();
builder.Services.AddSingleton<TestMaster2>();
builder.Services.AddSingleton<TestMaster3>();
builder.Services.AddSingleton<TestMaster4>();
//ע�������������������
builder.Services.AddSingleton<TestMasters>();

//����Windows��־��¼����ʾ��Ϣ
builder.Services.Configure<EventLogSettings>(config =>
{
    config.LogName = "ISO11820_Test_Manager";
    //�����Զ�Ӧ Windows�¼���¼��־�����е� "��Դ" ��ѯ�ֶ�
    config.SourceName = "ISO11820 Test Manager";
});

// ֧����WindowsService��ʽ�������������
builder.Host.UseWindowsService();

var app = builder.Build();

/* ================= ����HTTP����ܵ��м�� =================== */

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

app.MapHub<CalibrationHub>("/Calibration");

app.Run();
