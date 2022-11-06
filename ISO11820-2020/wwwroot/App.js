/*
 * 该模块执行应用程序初始化操作
*/

//导入全局模块
import { GlobalParam } from "./GlobalData.js"

// 导入主视图工具栏组件
import { AppToolBar } from "./components/app-toolbar/app-toolbar.js";

// 导入登录视图组件
import { LoginView } from "./views/view-login/view-login.js";

// 导入试验视图组件
import { TestView } from "./views/view-test/view-test.js";

//导入报表视图组件
import { ReportView } from "./views/view-report/view-report.js";

//导入查询视图组件
//...

/* 创建客户端视图组件 */
// 登录视图
const viewLogin = new LoginView();
// 主视图工具栏
const tbAppToolBar = new AppToolBar();
// 试验视图
const viewTest = new TestView();
// 报表视图
const viewReport = new ReportView();

// 查询视图
//...

//创建视图索引-对象集合
//let viewMap = new Map();
//viewMap.set('LoginView', viewLogin);
//viewMap.set('TestView', viewTest);
//viewMap.set('ReportView', viewReport);

/* 视图模型定义 */

let CurrentViewObject = null;

/* 初始化SignalR连接并注册监听Hub,开始接收试验控制器实时消息 */
var connection = new signalR.HubConnectionBuilder().withUrl("/Notify").build();
connection.on("MasterBroadCast", function (data) { 
    //解析服务器消息
    const json = JSON.parse(data);    
    //解析通信数据并刷新试验视图显示    
    if (viewTest !== null) {        
        viewTest.updateView(json);
    }

    //console.log(GlobalParam);
});
connection.start();

//switch (vwCurView) {
    //    case 'view-test':  //试验视图
    //        //const view = document.querySelector('view-test');
    //        //view.signalRCallback(json);
    //        vwTestView.signalRCallback(json);
    //        break;
    //    case 'view-cali':  //标定视图
    //        break;
    //    case 'view-param': //参数设置视图
    //        break;
    //    case null:
    //        break;
    //}

//测试代码: 客户端向服务端发送命令的代理
/*
    功能: 客户端向服务端发送命令的代理,这些命令的返回结果会使客户端切换主视图内容
    参数:
         cmd:string - 命令名称
         param:JSON - 命令参数
*/
function SendClientCmd(cmd, param) {
    switch (cmd) {
        case 'login':  //系统登录
            // window.fetch(`api/TestMaster/startidle/${id}`)
            //     .then(console.log(`Master ${id} Idle Started.`));
            //若登录成功,则更新客户端全局存储
            //...

            //测试代码: 允许dash账户登录
            console.log(param.userName);
            if(param.userName === 'dash') {
                // 移除登录视图页面组件
                document.body.removeChild(viewLogin);
                // 取消主视图背景图片显示
                document.body.style.backgroundImage = "";
                // 添加主视图页面组件
                document.body.appendChild(tbAppToolBar);
                document.body.appendChild(viewTest);
                CurrentViewObject = viewTest;
                GlobalParam.CurrentViewName = 'TestView';

                GlobalParam.LoginUser = "dash";
            } else {
                console.log('user name invalid.');
            }
            break;
        case 'getmasterinfo':  //获取控制器信息
            window.fetch("api/testmaster")
                .then(response => console.log(response.json()));
            break;
        case 'starttimer':     //开始记录数据
            window.fetch(`api/testmaster/starttimer/${param}`)
                .then(response => console.log(response.json()))
                .then(data => console.log(data));
            break;
        case 'stoptimer':      //停止记录数据
            window.fetch(`api/testmaster/stoptimer/${param}`)
                .then(response => console.log(response.json()));
            break;
        case 'changeview':    //切换客户端视图
            if (GlobalParam.CurrentViewName !== param) {
                document.body.removeChild(CurrentViewObject);
                if (param === 'TestView') {                    
                    document.body.appendChild(viewTest);  
                    CurrentViewObject = viewTest;
                    GlobalParam.CurrentViewName = 'TestView';
                    console.log('viewTest selected.');
                } else if (param === 'ReportView') {
                    document.body.appendChild(viewReport);
                    CurrentViewObject = viewReport;
                    GlobalParam.CurrentViewName = 'ReportView';
                    console.log('viewReport selected.');
                } else if (param === 'QueryView') {

                }
            }            
            break;
        default:
            break;
    }
}

//document.body.appendChild(viewTest);
document.body.appendChild(viewLogin);
CurrentViewObject = viewLogin;

/* 获取试验控制器状态数据,该操作会使服务端创建试验控制器集合对象并激活控制器 */
SendClientCmd('getmasterinfo', '');

export { SendClientCmd, GlobalParam }