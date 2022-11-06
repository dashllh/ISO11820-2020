/* 
    该模块定义应用程序全局数据对象或变量
*/

//定义全局变量
//Mode:(0 - Standby | 1 - Calibration | 2 - SampleTest)
//Status: (0 - Idle | 1- Preparing | 2 - Ready | 3 - Recording | 4 - Complete | 5 - Exception)
//CurrentView: 客户端当前视图字符名称
let GlobalParam = {
    "TestMasters": [
        { "Id": 0, "Mode": 0, "Status": 0, "Id": "", "Name": "", "Port": "", "CheckDate": "", "ConstPower": 0 },
        { "Id": 1, "Mode": 0, "Status": 0, "Id": "", "Name": "", "Port": "", "CheckDate": "", "ConstPower": 1 },
        { "Id": 2, "Mode": 0, "Status": 0, "Id": "", "Name": "", "Port": "", "CheckDate": "", "ConstPower": 2 },
        { "Id": 3, "Mode": 0, "Status": 0, "Id": "", "Name": "", "Port": "", "CheckDate": "", "ConstPower": 3 },
    ],
    "LoginUser": "",
    "CurrentViewName": "TestView"
};

export { GlobalParam }