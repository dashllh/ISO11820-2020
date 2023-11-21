//#region 通用公共函数定义

/*
 * 功能: 四舍五入
 * 参数:
 *      data - 原始数据
 *      bit  - 要保留的小数位数
 * 返回:
 *      四舍五入后的结果数值 
*/
function getRound(data, bit) {
    var ret = undefined;
    switch (bit) {
        case 0:
            ret = Math.round(data);
            break;
        case 1:
            ret = Math.round((data + Number.EPSILON) * 10) / 10;
            break;
        case 2:
            ret = Math.round((data + Number.EPSILON) * 100) / 100;
            break;
        case 3:
            ret = Math.round((data + Number.EPSILON) * 1000) / 1000;
            break;
    }
    return ret;
}

/*
 * 功能:替换字符串中指定位置的字符 
 * 参数:
 *      str - 源字符串
 *      index - 要替换的字符索引
 *      chr - 替代字符
 * 返回:
 *      替换完成后的新字符串对象
*/
function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substring(0, index) + chr + str.substring(index + 1);
}

/* 功能: 新增一条试验控制器系统消息 
 * 参数:
 *      idx     - 试验控制器索引
 *      data    - 服务端API返回的消息对象
*/
function appendSysMsg(idx, data) {
    $(`#idTbMessage${idx}`).datagrid('insertRow', {
        index: 0,
        row: {
            time: data.param.time,
            content: data.msg
        }
    });
}

/* 功能: 新增一条试验控制器系统消息 
 * 参数:
 *      idx     - 试验控制器索引
 *      data    - signalR返回的消息对象
*/
function appendSysMsgFromSigR(idx, data) {
    $(`#idTbMessage${idx}`).datagrid('insertRow', {
        index: 0,
        row: {
            time: data.Time,
            content: data.Message
        }
    });
}

/* 功能: 新增一条传感器实时数据并同步更新温度曲线数据
 * 参数:
 *       idx  - 试验控制器索引
 *       data - signalR实时数据对象
 */
function appendSensorData(idx, data) {
    // 新增传感器列表数据
    $(`#idTbSensor${idx}`).datagrid('insertRow', {
        index: 0,
        row: {
            timer: data.Timer,
            temp1: data.sensorDataCatch.Temp1,
            temp2: data.sensorDataCatch.Temp2,
            tempsuf: data.sensorDataCatch.TempSuf,
            tempcen: data.sensorDataCatch.TempCen,
            tempdrift: Math.round((data.caculateDataCatch.TempDriftMean + Number.EPSILON) * 10) / 10
        }
    });
    // 如果计时超过60秒,则移除列表数据末尾行
    if (data.Timer > 60) {
        var rows = $(`#idTbSensor${idx}`).datagrid('getRows');
        $(`#idTbSensor${idx}`).datagrid('deleteRow', rows.length - 1);
    }
    // 新增曲线数据
    _charts[idx].config.data.labels.push(data.Timer);
    _charts[idx].config.data.datasets[0].data.push(data.sensorDataCatch.Temp1);
    _charts[idx].config.data.datasets[1].data.push(data.sensorDataCatch.Temp2);
    _charts[idx].config.data.datasets[2].data.push(data.sensorDataCatch.TempSuf);
    _charts[idx].config.data.datasets[3].data.push(data.sensorDataCatch.TempCen);
    _charts[idx].target.update();
    // 如果计时超过10分钟,则移除图表头部数据点
    if (data.Timer > 600) {
        _charts[idx].config.data.labels.shift();
        _charts[idx].config.data.datasets[0].data.shift();
        _charts[idx].config.data.datasets[1].data.shift();
        _charts[idx].config.data.datasets[2].data.shift();
        _charts[idx].config.data.datasets[3].data.shift();
    }
}

/* 功能: 重置试验控制器面板显示
 * 参数:
 *       idx  - 试验控制器索引
 */
function resetMasterPanel(idx) {
    // 清空传感器列表显示
    $(`#idTbSensor${idx}`).datagrid('loadData', []);
    // 清空温度曲线
    _charts[idx].config.data.labels = [];
    _charts[idx].config.data.datasets[0].data = [];
    _charts[idx].config.data.datasets[1].data = [];
    _charts[idx].config.data.datasets[2].data = [];
    _charts[idx].config.data.datasets[3].data = [];
    _charts[idx].target.update();
}

//#endregion

//#region 全局事件函数定义

// 关于系统按钮
document.getElementById("btnAbout").onclick = function () {
    $('#dlgAbout').dialog('open');
}

// 退出系统按钮
document.getElementById("btnQuit").onclick = function () {
    window.fetch('api/testmaster/quitwithcheck')
        .then(response => response.json())
        .then(data => {
            if (data.ret === "0") {  // 所有试验控制器都处于空闲的情况,直接退出
                // 向本地应用程序发送退出消息
                window.chrome.webview.postMessage("quit");
            } else if (data.ret === "-1") { // 存在试验控制器处于试验中的情况,提示
                $.messager.confirm('系统提示', data.msg, (confirm) => {
                    if (confirm) {
                        window.fetch('api/testmaster/quitanyway')
                            .then(response => response.json())
                            .then(data => {
                                if (data.ret === "0") {
                                    // 向本地应用程序发送退出消息
                                    window.chrome.webview.postMessage("quit");
                                } else {
                                    // 服务端执行退出操作失败,提示客户端应执行的操作
                                    // ...
                                }
                            });
                    }
                });
            }
        });
};

//#endregion

//#region 用于与服务器端通信的客户端应用主数据模型(四个试验控制器独立数据模型)

// 一号炉
let dmMaster0 = {
    // 环境
    ambtemp: 25,       // 环境温度
    ambhumi: 55,       // 环境湿度
    // 设备
    apparatusid: '',   // 设备编号
    apparatusname: '', // 设备名称
    checkdatef: '',    // 检定日期(起始)
    checkdatet: '',    // 检定日期(终止)
    pidport: '',       // PID控制端口
    powerport: 'COM3', // 恒功率值控制端口
    constpower: 0,     // 最新的恒功率输出值
    status: '',        // 当前状态
    mode: '',          // 当前工作模式
    // 试样
    specimanid: '',    // 试样编号
    prodname: '',      // 产品名称
    prodspec: '',      // 产品规格型号
    prodheight: 0.0,   // 产品高度
    proddiameter: 0.0, // 产品直径
    prodweight: 0.0,   // 产品质量
    // 试验
    testid: '',        // 试验编号(样品标识号)
    testdate: '',      // 试验日期
    testaccord: '',    // 检验依据
    testmemo: '',      // 试验备注
    operator: '',      // 试验人员
    timer: 0,          // 当前试验计时
    // 试验记录
    pheno: '0000',      // 现象编码
    flametime: 0,       // 火焰发生时间
    flameduration: 0,   // 火焰持续时间
    postweight: 0,      // 试样残余质量
    // 传感器
    tf1: 0,            // 炉内温度1
    tf2: 0,            // 炉内温度2
    ts: 0,             // 试样表面温度
    tc: 0,             // 试样中心温度
    // 计算值
    drift1: 0.0,       // 炉内温度1的10分钟漂移值
    drift2: 0.0,       // 炉内温度2的10分钟漂移值
    driftmean: 0.0     // 炉内温度1与炉内温度2的10分钟平均漂移值
}
// 二号炉
let dmMaster1 = {
    // 环境
    ambtemp: 25,       // 环境温度
    ambhumi: 55,       // 环境湿度
    // 设备
    apparatusid: '',   // 设备编号
    apparatusname: '', // 设备名称
    checkdatef: '',    // 检定日期(起始)
    checkdatet: '',    // 检定日期(终止)
    pidport: '',       // PID控制端口
    powerport: 'COM3', // 恒功率值控制端口
    constpower: 0,     // 最新的恒功率输出值
    status: '',        // 当前状态
    mode: '',          // 当前工作模式
    // 试样
    specimanid: '',    // 试样编号
    prodname: '',      // 产品名称
    prodspec: '',      // 产品规格型号
    prodheight: 0.0,   // 产品高度
    proddiameter: 0.0, // 产品直径
    prodweight: 0.0,   // 产品质量
    // 试验
    testid: '',        // 试验编号(样品标识号)
    testdate: '',      // 试验日期
    testaccord: '',    // 检验依据
    testmemo: '',      // 试验备注
    operator: '',      // 试验人员
    timer: 0,          // 当前试验计时
    // 试验记录
    pheno: '0000',      // 现象编码
    flametime: 0,       // 火焰发生时间
    flameduration: 0,   // 火焰持续时间
    postweight: 0,      // 试样残余质量
    // 传感器
    tf1: 0,            // 炉内温度1
    tf2: 0,            // 炉内温度2
    ts: 0,             // 试样表面温度
    tc: 0,             // 试样中心温度
    // 计算值
    drift1: 0.0,       // 炉内温度1的10分钟漂移值
    drift2: 0.0,       // 炉内温度2的10分钟漂移值
    driftmean: 0.0     // 炉内温度1与炉内温度2的10分钟平均漂移值
}
// 三号炉
let dmMaster2 = {
    // 环境
    ambtemp: 25,       // 环境温度
    ambhumi: 55,       // 环境湿度
    // 设备
    apparatusid: '',   // 设备编号
    apparatusname: '', // 设备名称
    checkdatef: '',    // 检定日期(起始)
    checkdatet: '',    // 检定日期(终止)
    pidport: '',       // PID控制端口
    powerport: 'COM3', // 恒功率值控制端口
    constpower: 0,     // 最新的恒功率输出值
    status: '',        // 当前状态
    mode: '',          // 当前工作模式
    // 试样
    specimanid: '',    // 试样编号
    prodname: '',      // 产品名称
    prodspec: '',      // 产品规格型号
    prodheight: 0.0,   // 产品高度
    proddiameter: 0.0, // 产品直径
    prodweight: 0.0,   // 产品质量
    // 试验
    testid: '',        // 试验编号(样品标识号)
    testdate: '',      // 试验日期
    testaccord: '',    // 检验依据
    testmemo: '',      // 试验备注
    operator: '',      // 试验人员
    timer: 0,          // 当前试验计时
    // 试验记录
    pheno: '0000',      // 现象编码
    flametime: 0,       // 火焰发生时间
    flameduration: 0,   // 火焰持续时间
    postweight: 0,      // 试样残余质量
    // 传感器
    tf1: 0,            // 炉内温度1
    tf2: 0,            // 炉内温度2
    ts: 0,             // 试样表面温度
    tc: 0,             // 试样中心温度
    // 计算值
    drift1: 0.0,       // 炉内温度1的10分钟漂移值
    drift2: 0.0,       // 炉内温度2的10分钟漂移值
    driftmean: 0.0     // 炉内温度1与炉内温度2的10分钟平均漂移值
}
// 四号炉
let dmMaster3 = {
    // 环境
    ambtemp: 25,       // 环境温度
    ambhumi: 55,       // 环境湿度
    // 设备
    apparatusid: '',   // 设备编号
    apparatusname: '', // 设备名称
    checkdatef: '',    // 检定日期(起始)
    checkdatet: '',    // 检定日期(终止)
    pidport: '',       // PID控制端口
    powerport: 'COM3', // 恒功率值控制端口
    constpower: 0,     // 最新的恒功率输出值
    status: '',        // 当前状态
    mode: '',          // 当前工作模式
    // 试样
    specimanid: '',    // 试样编号
    prodname: '',      // 产品名称
    prodspec: '',      // 产品规格型号
    prodheight: 0.0,   // 产品高度
    proddiameter: 0.0, // 产品直径
    prodweight: 0.0,   // 产品质量
    // 试验
    testid: '',        // 试验编号(样品标识号)
    testdate: '',      // 试验日期
    testaccord: '',    // 检验依据
    testmemo: '',      // 试验备注
    operator: '',      // 试验人员
    timer: 0,          // 当前试验计时
    // 试验记录
    pheno: '0000',      // 现象编码
    flametime: 0,       // 火焰发生时间
    flameduration: 0,   // 火焰持续时间
    postweight: 0,      // 试样残余质量
    // 传感器
    tf1: 0,            // 炉内温度1
    tf2: 0,            // 炉内温度2
    ts: 0,             // 试样表面温度
    tc: 0,             // 试样中心温度
    // 计算值
    drift1: 0.0,       // 炉内温度1的10分钟漂移值
    drift2: 0.0,       // 炉内温度2的10分钟漂移值
    driftmean: 0.0     // 炉内温度1与炉内温度2的10分钟平均漂移值
}

// 校准视图数据模型
let dmCalibration = {
    tempcali: 0.0,
    tempa1: 0.0,
    tempa2: 0.0,
    tempa3: 0.0,
    tempb1: 0.0,
    tempb2: 0.0,
    tempb3: 0.0,
    tempc1: 0.0,
    tempc2: 0.0,
    tempc3: 0.0,
    t_avg: 0.0,
    t_avg_axis1: 0.0,
    t_avg_axis2: 0.0,
    t_avg_axis3: 0.0,
    t_dev_axis1: 0.0,
    t_dev_axis2: 0.0,
    t_dev_axis3: 0.0,
    t_avg_dev_axis: 0.0,
    t_avg_levela: 0.0,
    t_avg_levelb: 0.0,
    t_avg_levelc: 0.0,
    t_dev_levela: 0.0,
    t_dev_levelb: 0.0,
    t_dev_levelc: 0.0,
    t_avg_dev_level: 0.0,

    temp5: 0.0,
    temp15: 0.0,
    temp25: 0.0,
    temp35: 0.0,
    temp45: 0.0,
    temp55: 0.0,
    temp65: 0.0,
    temp75: 0.0,
    temp85: 0.0,
    temp95: 0.0,
    temp105: 0.0,
    temp115: 0.0,
    temp125: 0.0,
    temp135: 0.0,
    temp145: 0.0,
}

//#endregion

//#region 样品试验视图温度图表数据及功能代码

// 温度图表共通属性
let config_chartCommonOptions =
{
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            beginAtZero: true,
            ticks: {
                maxTicksLimit: 10
            }
        },
        y: {
            beginAtZero: true,
            suggestedMax: 800,
            title: {
                display: true,
                text: '温度(℃)'
            }
        }
    },
    plugins: {
        legend: {
            labels: {
                boxWidth: 25,
                boxHeight: 2
            }
        }
    }
}
// 一号炉温度图表配置项
let config_chartTemp0 = {
    type: 'line',
    data: {
        datasets: [
            { label: 'TF1', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TF2', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TS', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TC', data: [], borderWidth: 1, pointRadius: 0 }
        ],
        labels: []
    },
    options: config_chartCommonOptions
};
// 二号炉温度图表配置项
let config_chartTemp1 = {
    type: 'line',
    data: {
        datasets: [
            { label: 'TF1', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TF2', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TS', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TC', data: [], borderWidth: 1, pointRadius: 0 }
        ],
        labels: []
    },
    options: config_chartCommonOptions
};
// 三号炉温度图表配置项
let config_chartTemp2 = {
    type: 'line',
    data: {
        datasets: [
            { label: 'TF1', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TF2', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TS', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TC', data: [], borderWidth: 1, pointRadius: 0 }
        ],
        labels: []
    },
    options: config_chartCommonOptions
};
// 四号炉温度图表配置项
let config_chartTemp3 = {
    type: 'line',
    data: {
        datasets: [
            { label: 'TF1', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TF2', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TS', data: [], borderWidth: 1, pointRadius: 0 },
            { label: 'TC', data: [], borderWidth: 1, pointRadius: 0 }
        ],
        labels: []
    },
    options: config_chartCommonOptions
};
// 用于图表访问控制的数据结构
let _charts = [
    { target: null, config: config_chartTemp0 },
    { target: null, config: config_chartTemp1 },
    { target: null, config: config_chartTemp2 },
    { target: null, config: config_chartTemp3 }
]
// 初始化炉温度图表对象
for (let i = 0; i < 4; i++) {
    _charts[i].target = new Chart(document.getElementById("chartTemp" + i), _charts[i].config);
}

// 测试代码: 动态设置X轴标签
// for (let i = 0; i <= 181; i++) {
//     objChart.data.labels.push(i);
// }
// objChart0.update();

//#endregion

//#region 一号炉控制面板控件事件注册

// 【开始计时】工具栏按钮
document.getElementById('btnNewTest0').addEventListener('click', (event) => {
    $('#dlgNewTest0').dialog('open');
});
// 新建试验对话框【取消】按钮
document.getElementById('btnCancelNewTest0').addEventListener('click', (event) => {
    $('#dlgNewTest0').dialog('close');
});
// 新建试验对话框【确定】按钮
document.getElementById('btnSubmitNewTest0').addEventListener('click', (event) => {
    /* 验证输入数据 */
    let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
    // 环境温度
    if (!reg_float.test(dmMaster0.ambtemp)) {
        document.getElementById('txtAmbTemp0').invaid = true;
        document.getElementById('txtAmbTemp0').focus();
        return;
    } else {
        document.getElementById('txtAmbTemp0').invaid = false;
    }
    // 环境湿度
    if (!reg_float.test(dmMaster0.ambhumi)) {
        document.getElementById('txtAmbHumi0').invaid = true;
        document.getElementById('txtAmbHumi0').focus();
        return;
    } else {
        document.getElementById('txtAmbHumi0').invaid = false;
    }
    // 试样高度
    if (!reg_float.test(dmMaster0.prodheight)) {
        document.getElementById('txtProdHeight0').invaid = true;
        document.getElementById('txtProdHeight0').focus();
        return;
    } else {
        document.getElementById('txtProdHeight0').invaid = false;
    }
    // 试样直径
    if (!reg_float.test(dmMaster0.proddiameter)) {
        document.getElementById('txtProdDiameter0').invaid = true;
        document.getElementById('txtProdDiameter0').focus();
        return;
    } else {
        document.getElementById('txtProdDiameter0').invaid = false;
    }
    // 试样质量(烧前)
    if (!reg_float.test(dmMaster0.prodweight)) {
        document.getElementById('txtProdWeight0').invaid = true;
        document.getElementById('txtProdWeight0').focus();
        return;
    } else {
        document.getElementById('txtProdWeight0').invaid = false;
    }
    // 上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            AmbTemp: dmMaster0.ambtemp,
            AmbHumi: dmMaster0.ambhumi,
            SmpId: dmMaster0.specimanid,
            SmpSubId: dmMaster0.testid,
            SmpName: dmMaster0.prodname,
            SmpSpec: dmMaster0.prodspec,
            SmpHeight: dmMaster0.prodheight,
            SmpDiameter: dmMaster0.proddiameter,
            SmpWeight: dmMaster0.prodheight,
            TestId: dmMaster0.testid,
            TestDate: dmMaster0.testdate,
            TestAccord: dmMaster0.testaccord,
            Operator: dmMaster0.operator,
            ApparatusId: dmMaster0.apparatusid,
            ApparatusName: dmMaster0.apparatusname,
            ApparatusChkDate: dmMaster0.checkdatet,
            ConstPower: dmMaster0.constpower,
            TestMemo: dmMaster0.testmemo
        })
    }
    fetch('api/testmaster/newtest/0', option)
        .then(response => response.json())
        .then(data => appendSysMsg(0, data));
    // 关闭对话框
    $('#dlgNewTest0').dialog('close');
});

// 【开始记录】工具栏按钮
document.getElementById('btnStartRecord0').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/starttimer/0`)
        .then(response => response.json())
        .then(data => appendSysMsg(0, data));
});

// 【停止记录】工具栏按钮
document.getElementById('btnStopRecord0').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/stoptimer/0`)
        .then(response => response.json())
        .then(data => appendSysMsg(0, data));
});

// 【试验记录】工具栏按钮
document.getElementById('btnSetPheno0').addEventListener('click', (event) => {
    $('#dlgSetPheno0').dialog('open');
});
// 试验记录对话框【取消】按钮
document.getElementById('btnCancelPheno0').addEventListener('click', (event) => {
    $('#dlgSetPheno0').dialog('close');
});
// 试验记录对话框【确定】按钮
document.getElementById('btnSubmitPheno0').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            pheno: dmProxy_Master0.pheno,
            flametime: dmProxy_Master0.flametime,
            flamedur: dmProxy_Master0.flameduration,
            postweight: dmProxy_Master0.postweight
        })
    }
    fetch(`api/testmaster/setpostdata/0`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(0, data));
    // 关闭对话框
    $('#dlgSetPheno0').dialog('close');
});

// 【参数设置】工具栏按钮
document.getElementById('btnSetParam0').addEventListener('click', (event) => {
    $('#dlgSetParam0').dialog('open');
});
// 参数设置对话框【取消】按钮
document.getElementById('btnCancelSetParam0').addEventListener('click', (event) => {
    $('#dlgSetParam0').dialog('close');
});
// 参数设置对话框【确定】按钮
document.getElementById('btnSubmitSetParam0').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            innernumber: dmProxy_Master0.apparatusid,
            apparatusname: dmProxy_Master0.apparatusname,
            checkdatef: dmProxy_Master0.checkdatef,
            checkdatet: dmProxy_Master0.checkdatet,
            pidport: dmProxy_Master0.pidport,
            powerport: dmProxy_Master0.powerport,
            constpower: dmProxy_Master0.constpower
        })
    }
    fetch(`api/testmaster/setapparatusparam/0`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(0, data));
    // 关闭对话框
    $('#dlgSetParam0').dialog('close');
});

// 【开始加热】工具栏按钮
document.getElementById('btnPowerOn0').addEventListener('click', (event) => {
    fetch(`api/testmaster/startheating/0`)
        .then(response => response.json())
        .then(data => {
            // 启动加热程序成功,设置加热状态指示为[加热中]
            if (data.ret === "0") {
                document.getElementById(`imgIndicator0`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/heat.png";
            }
            appendSysMsg(0, data);
        });
});

// 【停止加热】工具栏按钮
document.getElementById('btnPowerOff0').addEventListener('click', (event) => {
    fetch(`api/testmaster/stopheating/0`)
        .then(response => response.json())
        .then(data => {
            // 停止加热成功,设置加热指示为空白
            if (data.ret === "0") {
                document.getElementById(`imgIndicator0`).src = "";
            }
            appendSysMsg(0, data);
        });
});

// 试验现象 - 持续火焰checkbox
document.getElementById('chkFlame0').addEventListener('change', (event) => {
    document.getElementById('txtFlameTime0').disabled = !document.getElementById('chkFlame0').checked;
    document.getElementById('txtDurationTime0').disabled = !document.getElementById('chkFlame0').checked;
    // 设置现象编码
    dmProxy_Master0.pheno = setCharAt(dmProxy_Master0.pheno, 0, document.getElementById('chkFlame0').checked ? '1' : '0');
});

//#endregion

//#region 二号炉控制面板控件事件注册

// 【开始计时】工具栏按钮
document.getElementById('btnNewTest1').addEventListener('click', (event) => {
    $('#dlgNewTest1').dialog('open');
});
// 新建试验对话框【取消】按钮
document.getElementById('btnCancelNewTest1').addEventListener('click', (event) => {
    $('#dlgNewTest1').dialog('close');
});
// 新建试验对话框【确定】按钮
document.getElementById('btnSubmitNewTest1').addEventListener('click', (event) => {
    /* 验证输入数据 */
    let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
    // 环境温度
    if (!reg_float.test(dmMaster1.ambtemp)) {
        document.getElementById('txtAmbTemp1').invaid = true;
        document.getElementById('txtAmbTemp1').focus();
        return;
    } else {
        document.getElementById('txtAmbTemp1').invaid = false;
    }
    // 环境湿度
    if (!reg_float.test(dmMaster1.ambhumi)) {
        document.getElementById('txtAmbHumi1').invaid = true;
        document.getElementById('txtAmbHumi1').focus();
        return;
    } else {
        document.getElementById('txtAmbHumi1').invaid = false;
    }
    // 试样高度
    if (!reg_float.test(dmMaster1.prodheight)) {
        document.getElementById('txtProdHeight1').invaid = true;
        document.getElementById('txtProdHeight1').focus();
        return;
    } else {
        document.getElementById('txtProdHeight1').invaid = false;
    }
    // 试样直径
    if (!reg_float.test(dmMaster1.proddiameter)) {
        document.getElementById('txtProdDiameter1').invaid = true;
        document.getElementById('txtProdDiameter1').focus();
        return;
    } else {
        document.getElementById('txtProdDiameter1').invaid = false;
    }
    // 试样质量(烧前)
    if (!reg_float.test(dmMaster1.prodweight)) {
        document.getElementById('txtProdWeight1').invaid = true;
        document.getElementById('txtProdWeight1').focus();
        return;
    } else {
        document.getElementById('txtProdWeight1').invaid = false;
    }
    // 上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            AmbTemp: dmMaster1.ambtemp,
            AmbHumi: dmMaster1.ambhumi,
            SmpId: dmMaster1.specimanid,
            SmpSubId: dmMaster1.testid,
            SmpName: dmMaster1.prodname,
            SmpSpec: dmMaster1.prodspec,
            SmpHeight: dmMaster1.prodheight,
            SmpDiameter: dmMaster1.proddiameter,
            SmpWeight: dmMaster1.prodheight,
            TestId: dmMaster1.testid,
            TestDate: dmMaster1.testdate,
            TestAccord: dmMaster1.testaccord,
            Operator: dmMaster1.operator,
            ApparatusId: dmMaster1.apparatusid,
            ApparatusName: dmMaster1.apparatusname,
            ApparatusChkDate: dmMaster1.checkdatet,
            ConstPower: dmMaster1.constpower,
            TestMemo: dmMaster1.testmemo
        })
    }
    fetch('api/testmaster/newtest/1', option)
        .then(response => response.json())
        .then(data => appendSysMsg(1, data));
    // 关闭对话框
    $('#dlgNewTest1').dialog('close');
});

// 【开始记录】工具栏按钮
document.getElementById('btnStartRecord1').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/starttimer/1`)
        .then(response => response.json())
        .then(data => appendSysMsg(1, data));
});

// 【停止记录】工具栏按钮
document.getElementById('btnStopRecord1').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/stoptimer/1`)
        .then(response => response.json())
        .then(data => appendSysMsg(1, data));
});

// 【试验记录】工具栏按钮
document.getElementById('btnSetPheno1').addEventListener('click', (event) => {
    $('#dlgSetPheno1').dialog('open');
});
// 试验记录对话框【取消】按钮
document.getElementById('btnCancelPheno1').addEventListener('click', (event) => {
    $('#dlgSetPheno1').dialog('close');
});
// 试验记录对话框【确定】按钮
document.getElementById('btnSubmitPheno1').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            pheno: dmProxy_Master1.pheno,
            flametime: dmProxy_Master1.flametime,
            flamedur: dmProxy_Master1.flameduration,
            postweight: dmProxy_Master1.postweight
        })
    }
    fetch(`api/testmaster/setpostdata/1`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(1, data));
    // 关闭对话框
    $('#dlgSetPheno1').dialog('close');
});

// 【参数设置】工具栏按钮
document.getElementById('btnSetParam1').addEventListener('click', (event) => {
    $('#dlgSetParam1').dialog('open');
});
// 参数设置对话框【取消】按钮
document.getElementById('btnCancelSetParam1').addEventListener('click', (event) => {
    $('#dlgSetParam1').dialog('close');
});
// 参数设置对话框【确定】按钮
document.getElementById('btnSubmitSetParam1').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            innernumber: dmProxy_Master1.apparatusid,
            apparatusname: dmProxy_Master1.apparatusname,
            checkdatef: dmProxy_Master1.checkdatef,
            checkdatet: dmProxy_Master1.checkdatet,
            pidport: dmProxy_Master1.pidport,
            powerport: dmProxy_Master1.powerport,
            constpower: dmProxy_Master1.constpower
        })
    }
    fetch(`api/testmaster/setapparatusparam/1`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(1, data));
    // 关闭对话框
    $('#dlgSetParam1').dialog('close');
});

// 【开始加热】工具栏按钮
document.getElementById('btnPowerOn1').addEventListener('click', (event) => {
    fetch(`api/testmaster/startheating/1`)
        .then(response => response.json())
        .then(data => {
            // 启动加热程序成功,设置加热状态指示为[加热中]
            if (data.ret === "0") {
                document.getElementById(`imgIndicator1`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/heat.png";
            }
            appendSysMsg(1, data);
        });
});

// 【停止加热】工具栏按钮
document.getElementById('btnPowerOff1').addEventListener('click', (event) => {
    fetch(`api/testmaster/stopheating/1`)
        .then(response => response.json())
        .then(data => {
            // 停止加热成功,设置加热指示为空白
            if (data.ret === "0") {
                document.getElementById(`imgIndicator1`).src = "";
            }
            appendSysMsg(1, data);
        });
});

// 试验现象 - 持续火焰checkbox
document.getElementById('chkFlame1').addEventListener('change', (event) => {
    document.getElementById('txtFlameTime1').disabled = !document.getElementById('chkFlame1').checked;
    document.getElementById('txtDurationTime1').disabled = !document.getElementById('chkFlame1').checked;
    // 设置现象编码
    dmProxy_Master1.pheno = setCharAt(dmProxy_Master1.pheno, 0, document.getElementById('chkFlame1').checked ? '1' : '0');
});

//#endregion 

//#region 三号炉控制面板控件事件注册

// 【开始计时】工具栏按钮
document.getElementById('btnNewTest2').addEventListener('click', (event) => {
    $('#dlgNewTest2').dialog('open');
});
// 新建试验对话框【取消】按钮
document.getElementById('btnCancelNewTest2').addEventListener('click', (event) => {
    $('#dlgNewTest2').dialog('close');
});
// 新建试验对话框【确定】按钮
document.getElementById('btnSubmitNewTest2').addEventListener('click', (event) => {
    /* 验证输入数据 */
    let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
    // 环境温度
    if (!reg_float.test(dmMaster2.ambtemp)) {
        document.getElementById('txtAmbTemp2').invaid = true;
        document.getElementById('txtAmbTemp2').focus();
        return;
    } else {
        document.getElementById('txtAmbTemp2').invaid = false;
    }
    // 环境湿度
    if (!reg_float.test(dmMaster2.ambhumi)) {
        document.getElementById('txtAmbHumi2').invaid = true;
        document.getElementById('txtAmbHumi2').focus();
        return;
    } else {
        document.getElementById('txtAmbHumi2').invaid = false;
    }
    // 试样高度
    if (!reg_float.test(dmMaster2.prodheight)) {
        document.getElementById('txtProdHeight2').invaid = true;
        document.getElementById('txtProdHeight2').focus();
        return;
    } else {
        document.getElementById('txtProdHeight2').invaid = false;
    }
    // 试样直径
    if (!reg_float.test(dmMaster2.proddiameter)) {
        document.getElementById('txtProdDiameter2').invaid = true;
        document.getElementById('txtProdDiameter2').focus();
        return;
    } else {
        document.getElementById('txtProdDiameter2').invaid = false;
    }
    // 试样质量(烧前)
    if (!reg_float.test(dmMaster2.prodweight)) {
        document.getElementById('txtProdWeight2').invaid = true;
        document.getElementById('txtProdWeight2').focus();
        return;
    } else {
        document.getElementById('txtProdWeight2').invaid = false;
    }
    // 上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            AmbTemp: dmMaster2.ambtemp,
            AmbHumi: dmMaster2.ambhumi,
            SmpId: dmMaster2.specimanid,
            SmpSubId: dmMaster2.testid,
            SmpName: dmMaster2.prodname,
            SmpSpec: dmMaster2.prodspec,
            SmpHeight: dmMaster2.prodheight,
            SmpDiameter: dmMaster2.proddiameter,
            SmpWeight: dmMaster2.prodheight,
            TestId: dmMaster2.testid,
            TestDate: dmMaster2.testdate,
            TestAccord: dmMaster2.testaccord,
            Operator: dmMaster2.operator,
            ApparatusId: dmMaster2.apparatusid,
            ApparatusName: dmMaster2.apparatusname,
            ApparatusChkDate: dmMaster2.checkdatet,
            ConstPower: dmMaster2.constpower,
            TestMemo: dmMaster2.testmemo
        })
    }
    fetch('api/testmaster/newtest/2', option)
        .then(response => response.json())
        .then(data => appendSysMsg(2, data));
    // 关闭对话框
    $('#dlgNewTest2').dialog('close');
});

// 【开始记录】工具栏按钮
document.getElementById('btnStartRecord2').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/starttimer/2`)
        .then(response => response.json())
        .then(data => appendSysMsg(2, data));
});

// 【停止记录】工具栏按钮
document.getElementById('btnStopRecord2').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/stoptimer/2`)
        .then(response => response.json())
        .then(data => appendSysMsg(2, data));
});

// 【试验记录】工具栏按钮
document.getElementById('btnSetPheno2').addEventListener('click', (event) => {
    $('#dlgSetPheno2').dialog('open');
});
// 试验记录对话框【取消】按钮
document.getElementById('btnCancelPheno2').addEventListener('click', (event) => {
    $('#dlgSetPheno2').dialog('close');
});
// 试验记录对话框【确定】按钮
document.getElementById('btnSubmitPheno2').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            pheno: dmProxy_Master2.pheno,
            flametime: dmProxy_Master2.flametime,
            flamedur: dmProxy_Master2.flameduration,
            postweight: dmProxy_Master2.postweight
        })
    }
    fetch(`api/testmaster/setpostdata/2`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(2, data));
    // 关闭对话框
    $('#dlgSetPheno2').dialog('close');
});

// 【参数设置】工具栏按钮
document.getElementById('btnSetParam2').addEventListener('click', (event) => {
    $('#dlgSetParam2').dialog('open');
});
// 参数设置对话框【取消】按钮
document.getElementById('btnCancelSetParam2').addEventListener('click', (event) => {
    $('#dlgSetParam2').dialog('close');
});
// 参数设置对话框【确定】按钮
document.getElementById('btnSubmitSetParam2').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            innernumber: dmProxy_Master2.apparatusid,
            apparatusname: dmProxy_Master2.apparatusname,
            checkdatef: dmProxy_Master2.checkdatef,
            checkdatet: dmProxy_Master2.checkdatet,
            pidport: dmProxy_Master2.pidport,
            powerport: dmProxy_Master2.powerport,
            constpower: dmProxy_Master2.constpower
        })
    }
    fetch(`api/testmaster/setapparatusparam/2`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(2, data));
    // 关闭对话框
    $('#dlgSetParam2').dialog('close');
});

// 【开始加热】工具栏按钮
document.getElementById('btnPowerOn2').addEventListener('click', (event) => {
    fetch(`api/testmaster/startheating/2`)
        .then(response => response.json())
        .then(data => {
            // 启动加热程序成功,设置加热状态指示为[加热中]
            if (data.ret === "0") {
                document.getElementById(`imgIndicator2`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/heat.png";
            }
            appendSysMsg(2, data);
        });
});

// 【停止加热】工具栏按钮
document.getElementById('btnPowerOff2').addEventListener('click', (event) => {
    fetch(`api/testmaster/stopheating/2`)
        .then(response => response.json())
        .then(data => {
            // 停止加热成功,设置加热指示为空白
            if (data.ret === "0") {
                document.getElementById(`imgIndicator2`).src = "";
            }
            appendSysMsg(2, data);
        });
});

// 试验现象 - 持续火焰checkbox
document.getElementById('chkFlame2').addEventListener('change', (event) => {
    document.getElementById('txtFlameTime2').disabled = !document.getElementById('chkFlame2').checked;
    document.getElementById('txtDurationTime2').disabled = !document.getElementById('chkFlame2').checked;
    // 设置现象编码
    dmProxy_Master2.pheno = setCharAt(dmProxy_Master2.pheno, 0, document.getElementById('chkFlame2').checked ? '1' : '0');
});

//#endregion

//#region 四号炉控制面板控件事件注册

// 【开始计时】工具栏按钮
document.getElementById('btnNewTest3').addEventListener('click', (event) => {
    $('#dlgNewTest3').dialog('open');
});
// 新建试验对话框【取消】按钮
document.getElementById('btnCancelNewTest3').addEventListener('click', (event) => {
    $('#dlgNewTest3').dialog('close');
});
// 新建试验对话框【确定】按钮
document.getElementById('btnSubmitNewTest3').addEventListener('click', (event) => {
    /* 验证输入数据 */
    let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
    // 环境温度
    if (!reg_float.test(dmMaster3.ambtemp)) {
        document.getElementById('txtAmbTemp3').invaid = true;
        document.getElementById('txtAmbTemp3').focus();
        return;
    } else {
        document.getElementById('txtAmbTemp3').invaid = false;
    }
    // 环境湿度
    if (!reg_float.test(dmMaster3.ambhumi)) {
        document.getElementById('txtAmbHumi3').invaid = true;
        document.getElementById('txtAmbHumi3').focus();
        return;
    } else {
        document.getElementById('txtAmbHumi3').invaid = false;
    }
    // 试样高度
    if (!reg_float.test(dmMaster3.prodheight)) {
        document.getElementById('txtProdHeight3').invaid = true;
        document.getElementById('txtProdHeight3').focus();
        return;
    } else {
        document.getElementById('txtProdHeight3').invaid = false;
    }
    // 试样直径
    if (!reg_float.test(dmMaster3.proddiameter)) {
        document.getElementById('txtProdDiameter3').invaid = true;
        document.getElementById('txtProdDiameter3').focus();
        return;
    } else {
        document.getElementById('txtProdDiameter3').invaid = false;
    }
    // 试样质量(烧前)
    if (!reg_float.test(dmMaster3.prodweight)) {
        document.getElementById('txtProdWeight3').invaid = true;
        document.getElementById('txtProdWeight3').focus();
        return;
    } else {
        document.getElementById('txtProdWeight3').invaid = false;
    }
    // 上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            AmbTemp: dmMaster3.ambtemp,
            AmbHumi: dmMaster3.ambhumi,
            SmpId: dmMaster3.specimanid,
            SmpSubId: dmMaster3.testid,
            SmpName: dmMaster3.prodname,
            SmpSpec: dmMaster3.prodspec,
            SmpHeight: dmMaster3.prodheight,
            SmpDiameter: dmMaster3.proddiameter,
            SmpWeight: dmMaster3.prodheight,
            TestId: dmMaster3.testid,
            TestDate: dmMaster3.testdate,
            TestAccord: dmMaster3.testaccord,
            Operator: dmMaster3.operator,
            ApparatusId: dmMaster3.apparatusid,
            ApparatusName: dmMaster3.apparatusname,
            ApparatusChkDate: dmMaster3.checkdatet,
            ConstPower: dmMaster3.constpower,
            TestMemo: dmMaster3.testmemo
        })
    }
    fetch('api/testmaster/newtest/3', option)
        .then(response => response.json())
        .then(data => appendSysMsg(3, data));
    // 关闭对话框
    $('#dlgNewTest3').dialog('close');
});

// 【开始记录】工具栏按钮
document.getElementById('btnStartRecord3').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/starttimer/3`)
        .then(response => response.json())
        .then(data => appendSysMsg(3, data));
});

// 【停止记录】工具栏按钮
document.getElementById('btnStopRecord3').addEventListener('click', (event) => {
    window.fetch(`api/testmaster/stoptimer/3`)
        .then(response => response.json())
        .then(data => appendSysMsg(3, data));
});

// 【试验记录】工具栏按钮
document.getElementById('btnSetPheno3').addEventListener('click', (event) => {
    $('#dlgSetPheno3').dialog('open');
});
// 试验记录对话框【取消】按钮
document.getElementById('btnCancelPheno3').addEventListener('click', (event) => {
    $('#dlgSetPheno3').dialog('close');
});
// 试验记录对话框【确定】按钮
document.getElementById('btnSubmitPheno3').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            pheno: dmProxy_Master3.pheno,
            flametime: dmProxy_Master3.flametime,
            flamedur: dmProxy_Master3.flameduration,
            postweight: dmProxy_Master3.postweight
        })
    }
    fetch(`api/testmaster/setpostdata/3`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(3, data));
    // 关闭对话框
    $('#dlgSetPheno3').dialog('close');
});

// 【参数设置】工具栏按钮
document.getElementById('btnSetParam3').addEventListener('click', (event) => {
    $('#dlgSetParam3').dialog('open');
});
// 参数设置对话框【取消】按钮
document.getElementById('btnCancelSetParam3').addEventListener('click', (event) => {
    $('#dlgSetParam3').dialog('close');
});
// 参数设置对话框【确定】按钮
document.getElementById('btnSubmitSetParam3').addEventListener('click', (event) => {
    //上传信息
    let option = {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            innernumber: dmProxy_Master3.apparatusid,
            apparatusname: dmProxy_Master3.apparatusname,
            checkdatef: dmProxy_Master3.checkdatef,
            checkdatet: dmProxy_Master3.checkdatet,
            pidport: dmProxy_Master3.pidport,
            powerport: dmProxy_Master3.powerport,
            constpower: dmProxy_Master3.constpower
        })
    }
    fetch(`api/testmaster/setapparatusparam/3`, option)
        .then(response => response.json())
        .then(data => appendSysMsg(3, data));
    // 关闭对话框
    $('#dlgSetParam3').dialog('close');
});

// 【开始加热】工具栏按钮
document.getElementById('btnPowerOn3').addEventListener('click', (event) => {
    fetch(`api/testmaster/startheating/3`)
        .then(response => response.json())
        .then(data => {
            // 启动加热程序成功,设置加热状态指示为[加热中]
            if (data.ret === "0") {
                document.getElementById(`imgIndicator3`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/heat.png";
            }
            appendSysMsg(3, data);
        });
});

// 【停止加热】工具栏按钮
document.getElementById('btnPowerOff3').addEventListener('click', (event) => {
    fetch(`api/testmaster/stopheating/3`)
        .then(response => response.json())
        .then(data => {
            // 停止加热成功,设置加热指示为空白
            if (data.ret === "0") {
                document.getElementById(`imgIndicator3`).src = "";
            }
            appendSysMsg(3, data);
        });
});

// 试验现象 - 持续火焰checkbox
document.getElementById('chkFlame3').addEventListener('change', (event) => {
    document.getElementById('txtFlameTime3').disabled = !document.getElementById('chkFlame3').checked;
    document.getElementById('txtDurationTime3').disabled = !document.getElementById('chkFlame3').checked;
    // 设置现象编码
    dmProxy_Master3.pheno = setCharAt(dmProxy_Master3.pheno, 0, document.getElementById('chkFlame3').checked ? '1' : '0');
});

//#endregion

//#region 试验控制器相关数据绑定

// 一号炉
// 实现数据模型到界面的绑定
let dmhandler_master0 = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const items = document.querySelectorAll(`[data-bind-master0=${property}]`);
            items.forEach(item => {
                item.value = value;
            });
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_Master0 = new Proxy(dmMaster0, dmhandler_master0);
// 实现界面到数据模型的绑定
const items_dlg_newtest0 = document.querySelectorAll("[data-bind-master0]");
items_dlg_newtest0.forEach((item) => {
    // 获取当前input元素绑定的ViewModel属性
    const propName = item.dataset.bindMaster0;
    // 实时更新数据模型的值
    item.addEventListener('input', (event) => {
        dmMaster0[propName] = item.value;
    });
}); // 一号炉(结束)

// 二号炉
// 实现数据模型到界面的绑定
let dmhandler_master1 = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const items = document.querySelectorAll(`[data-bind-master1=${property}]`);
            items.forEach(item => {
                item.value = value;
            });
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_Master1 = new Proxy(dmMaster1, dmhandler_master1);
// 实现界面到数据模型的绑定
const items_dlg_newtest1 = document.querySelectorAll("[data-bind-master1]");
items_dlg_newtest1.forEach((item) => {
    // 获取当前input元素绑定的ViewModel属性
    const propName = item.dataset.bindMaster1;
    // 实时更新数据模型的值
    item.addEventListener('input', (event) => {
        dmMaster1[propName] = item.value;
    });
}); // 二号炉(结束)

// 三号炉
// 实现数据模型到界面的绑定
let dmhandler_master2 = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const items = document.querySelectorAll(`[data-bind-master2=${property}]`);
            items.forEach(item => {
                item.value = value;
            });
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_Master2 = new Proxy(dmMaster2, dmhandler_master2);
// 实现界面到数据模型的绑定
const items_dlg_newtest2 = document.querySelectorAll("[data-bind-master2]");
items_dlg_newtest2.forEach((item) => {
    // 获取当前input元素绑定的ViewModel属性
    const propName = item.dataset.bindMaster2;
    // 实时更新数据模型的值
    item.addEventListener('input', (event) => {
        dmMaster2[propName] = item.value;
    });
}); // 三号炉(结束)

// 四号炉
// 实现数据模型到界面的绑定
let dmhandler_master3 = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const items = document.querySelectorAll(`[data-bind-master3=${property}]`);
            items.forEach(item => {
                item.value = value;
            });
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_Master3 = new Proxy(dmMaster3, dmhandler_master0);
// 实现界面到数据模型的绑定
const items_dlg_newtest3 = document.querySelectorAll("[data-bind-master3]");
items_dlg_newtest3.forEach((item) => {
    // 获取当前input元素绑定的ViewModel属性
    const propName = item.dataset.bindMaster3;
    // 实时更新数据模型的值
    item.addEventListener('input', (event) => {
        dmMaster3[propName] = item.value;
    });
}); // 四号炉(结束)

let dmProxy_Master = [dmProxy_Master0, dmProxy_Master1, dmProxy_Master2, dmProxy_Master3];

//#endregion

//#region 系统校准视图数据及功能代码

// 视图数据模型绑定(模型->界面)
let dmhandler_cali = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const items = document.querySelectorAll(`[data-bind-cali=${property}]`);
            items.forEach(item => {
                if (item.value === undefined) {
                    item.innerText = value;
                } else {
                    item.value = value;
                }
            });
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_Cali = new Proxy(dmCalibration, dmhandler_cali);

// 温度校准曲线数据
let config_caliview_chart = {
    type: 'scatter',
    data: {
        datasets: [
            {
                label: '温度下限', data: [{ x: 639, y: 145 }, { y: 135, x: 664 }, { y: 125, x: 683 }, { y: 115, x: 698 }, { y: 105, x: 709 }, { y: 95, x: 717 }, { y: 85, x: 722 }, { y: 75, x: 723 }, { y: 65, x: 720 }, { y: 55, x: 712 }, { y: 45, x: 699 }, { y: 35, x: 679 }, { y: 25, x: 652 }, { y: 15, x: 616 }, { y: 5, x: 570 }], borderWidth: 1, pointRadius: 2, showLine: true
            },
            {
                label: '记录值', data: [], borderWidth: 1, pointRadius: 2, showLine: true
            },
            {
                label: '温度上限', data: [{ x: 671, y: 145 }, { y: 135, x: 698 }, { y: 125, x: 716 }, { y: 115, x: 729 }, { y: 105, x: 737 }, { y: 95, x: 743 }, { y: 85, x: 746 }, { y: 75, x: 747 }, { y: 65, x: 746 }, { y: 55, x: 743 }, { y: 45, x: 736 }, { y: 35, x: 724 }, { y: 25, x: 705 }, { y: 15, x: 678 }, { y: 5, x: 639 }], borderWidth: 1, pointRadius: 2, showLine: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: '温度(℃)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: '炉内位置(mm)'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    boxWidth: 25,
                    boxHeight: 2
                }
            }
        }
    }
}
// 初始化温度图表
let chart_CentorPos = new Chart(document.getElementById('caliTempChart'), config_caliview_chart);

// 炉壁点位校准 - 校温热电偶实时曲线图
// 图表配置
let config_rtchart_r1 = {
    type: 'line',
    data: {
        datasets: [
            { label: '校温电偶温度', data: [700, 500, 600, 550], borderWidth: 1, pointRadius: 0 }
        ],
        labels: [0, 1, 2, 3]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                title: {
                    display: true,
                    text: '温度(℃)'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    boxWidth: 25,
                    boxHeight: 1
                }
            }
        }
    }
}
new Chart(document.getElementById('caliRealTimeChart_R1'), config_rtchart_r1);

// 中心点位校准 - 校温热电偶实时曲线图
let config_rtchart_r2 = {
    type: 'line',
    data: {
        datasets: [
            { label: '校温电偶温度', data: [700, 500, 600, 550], borderWidth: 1, pointRadius: 0 }
        ],
        labels: [0, 1, 2, 3]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                title: {
                    display: true,
                    suggestedMax: 750,
                    text: '温度(℃)'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    boxWidth: 25,
                    boxHeight: 1
                }
            }
        }
    }
}
new Chart(document.getElementById('caliRealTimeChart_R2'), config_rtchart_r2);

// 初始化客户端到校准热电偶信号的SignalR连接
var sigRCon_Cali = new signalR.HubConnectionBuilder()
    .withUrl("/Calibration")
    .configureLogging(signalR.LogLevel.Information)
    .build();
// 注册服务端实时消息处理函数
sigRCon_Cali.on("CaliBroadCast", function (data) {
    // 解析服务器消息
    dmProxy_Cali.tempcali = data;
});

// 注册三个平面点位点位校准【记录】按钮点击事件
document.getElementById('btnCaliFetch').addEventListener('click', (event) => {
    switch (document.getElementById('pos_level').value) {
        case 'a1':
            dmProxy_Cali.tempa1 = dmProxy_Cali.tempcali;
            break;
        case 'a2':
            dmProxy_Cali.tempa2 = dmProxy_Cali.tempcali;
            break;
        case 'a3':
            dmProxy_Cali.tempa3 = dmProxy_Cali.tempcali;
            break;
        case 'b1':
            dmProxy_Cali.tempb1 = dmProxy_Cali.tempcali;
            break;
        case 'b2':
            dmProxy_Cali.tempb2 = dmProxy_Cali.tempcali;
            break;
        case 'b3':
            dmProxy_Cali.tempb3 = dmProxy_Cali.tempcali;
            break;
        case 'c1':
            dmProxy_Cali.tempc1 = dmProxy_Cali.tempcali;
            break;
        case 'c2':
            dmProxy_Cali.tempc2 = dmProxy_Cali.tempcali;
            break;
        case 'c3':
            dmProxy_Cali.tempc3 = dmProxy_Cali.tempcali;
            break;
    }
});
// 注册三个平面点位点位校准【计算】按钮点击事件
document.getElementById('btnCaculateCaliResult').addEventListener('click', (event) => {

});

// 注册炉芯中轴点位校准【记录】按钮点击事件
document.getElementById('btnCaliFetchCenter').addEventListener('click', (event) => {
    // 根据点位当前选项设置对应数据模型的值并增加校准曲线对应点位值
    switch (document.getElementById('pos_axis').value) {
        case '5':
            dmProxy_Cali.temp5 = dmProxy_Cali.tempcali;
            // 增加图表对应点位
            config_caliview_chart.data.datasets[1].data.push({ y: 5, x: dmProxy_Cali.temp5 });
            chart_CentorPos.update();
            break;
        case '15':
            dmProxy_Cali.temp15 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 15, x: dmProxy_Cali.temp15 });
            chart_CentorPos.update();
            break;
        case '25':
            dmProxy_Cali.temp25 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 25, x: dmProxy_Cali.temp25 });
            chart_CentorPos.update();
            break;
        case '35':
            dmProxy_Cali.temp35 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 35, x: dmProxy_Cali.temp35 });
            chart_CentorPos.update();
            break;
        case '45':
            dmProxy_Cali.temp45 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 45, x: dmProxy_Cali.temp45 });
            chart_CentorPos.update();
            break;
        case '55':
            dmProxy_Cali.temp55 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 55, x: dmProxy_Cali.temp55 });
            chart_CentorPos.update();
            break;
        case '65':
            dmProxy_Cali.temp65 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 65, x: dmProxy_Cali.temp65 });
            chart_CentorPos.update();
            break;
        case '75':
            dmProxy_Cali.temp75 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 75, x: dmProxy_Cali.temp75 });
            chart_CentorPos.update();
            break;
        case '85':
            dmProxy_Cali.temp85 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 85, x: dmProxy_Cali.temp85 });
            chart_CentorPos.update();
            break;
        case '95':
            dmProxy_Cali.temp95 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 95, x: dmProxy_Cali.temp95 });
            chart_CentorPos.update();
            break;
        case '105':
            dmProxy_Cali.temp105 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 105, x: dmProxy_Cali.temp105 });
            chart_CentorPos.update();
            break;
        case '115':
            dmProxy_Cali.temp115 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 115, x: dmProxy_Cali.temp115 });
            chart_CentorPos.update();
            break;
        case '125':
            dmProxy_Cali.temp125 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 125, x: dmProxy_Cali.temp125 });
            chart_CentorPos.update();
            break;
        case '135':
            dmProxy_Cali.temp135 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 135, x: dmProxy_Cali.temp135 });
            chart_CentorPos.update();
            break;
        case '145':
            dmProxy_Cali.temp145 = dmProxy_Cali.tempcali;
            config_caliview_chart.data.datasets[1].data.push({ y: 145, x: dmProxy_Cali.temp145 });
            chart_CentorPos.update();
            break;
    }
});

// 注册【计算】按钮点击事件
document.getElementById('btnCaculateCaliResult').addEventListener('click', (event) => {
    // 计算t_avg
    dmProxy_Cali.t_avg = getRound((dmProxy_Cali.tempa1 + dmProxy_Cali.tempa2 + dmProxy_Cali.tempa3 + dmProxy_Cali.tempb1 + dmProxy_Cali.tempb2 + dmProxy_Cali.tempb3 + dmProxy_Cali.tempc1 + dmProxy_Cali.tempc2 + dmProxy_Cali.tempc3) / 9, 1);
    // t_avg_axis1
    dmProxy_Cali.t_avg_axis1 = getRound((dmProxy_Cali.tempa1 + dmProxy_Cali.tempb1 + dmProxy_Cali.tempc1) / 3, 1);
    // t_avg_axis2
    dmProxy_Cali.t_avg_axis2 = getRound((dmProxy_Cali.tempa2 + dmProxy_Cali.tempb2 + dmProxy_Cali.tempc2) / 3, 1);
    // t_avg_axis3
    dmProxy_Cali.t_avg_axis3 = getRound((dmProxy_Cali.tempa3 + dmProxy_Cali.tempb3 + dmProxy_Cali.tempc3) / 3, 1);
    // t_dev_axis1
    dmProxy_Cali.t_dev_axis1 = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_axis1) / dmProxy_Cali.t_avg), 2);
    // t_dev_axis2
    dmProxy_Cali.t_dev_axis2 = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_axis2) / dmProxy_Cali.t_avg), 2);
    // t_dev_axis3
    dmProxy_Cali.t_dev_axis3 = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_axis3) / dmProxy_Cali.t_avg), 2);
    // t_avg_dev_axis
    dmProxy_Cali.t_avg_dev_axis = getRound((dmProxy_Cali.t_dev_axis1 + dmProxy_Cali.t_dev_axis2 + dmProxy_Cali.t_dev_axis3) / 3, 1);
    // t_avg_levela
    dmProxy_Cali.t_avg_levela = getRound((dmProxy_Cali.tempa1 + dmProxy_Cali.tempa2 + dmProxy_Cali.tempa3) / 3, 1);
    // t_avg_levelb
    dmProxy_Cali.t_avg_levelb = getRound((dmProxy_Cali.tempb1 + dmProxy_Cali.tempb2 + dmProxy_Cali.tempb3) / 3, 1);
    // t_avg_levelc
    dmProxy_Cali.t_avg_levelc = getRound((dmProxy_Cali.tempc1 + dmProxy_Cali.tempc2 + dmProxy_Cali.tempc3) / 3, 1);
    // t_dev_levela
    dmProxy_Cali.t_dev_levela = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_levela) / dmProxy_Cali.t_avg), 2);
    // t_dev_levelb
    dmProxy_Cali.t_dev_levelb = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_levelb) / dmProxy_Cali.t_avg), 2);
    // t_dev_levelc
    dmProxy_Cali.t_dev_levelc = getRound(100 * (Math.abs(dmProxy_Cali.t_avg - dmProxy_Cali.t_avg_levelc) / dmProxy_Cali.t_avg), 2);
    // t_avg_dev_level
    dmProxy_Cali.t_avg_dev_level = getRound((dmProxy_Cali.t_dev_levela + dmProxy_Cali.t_dev_levelb + dmProxy_Cali.t_dev_levelc) / 3, 2);
});

// 注册【重置】按钮点击事件
document.getElementById('btnCaliFetchCenter_Reset').addEventListener('click', (event) => {
    // 重置中心点位数据模型的值
    dmProxy_Cali.temp5 = '';
    dmProxy_Cali.temp15 = '';
    dmProxy_Cali.temp25 = '';
    dmProxy_Cali.temp35 = '';
    dmProxy_Cali.temp45 = '';
    dmProxy_Cali.temp55 = '';
    dmProxy_Cali.temp65 = '';
    dmProxy_Cali.temp75 = '';
    dmProxy_Cali.temp85 = '';
    dmProxy_Cali.temp95 = '';
    dmProxy_Cali.temp105 = '';
    dmProxy_Cali.temp115 = '';
    dmProxy_Cali.temp125 = '';
    dmProxy_Cali.temp135 = '';
    dmProxy_Cali.temp145 = '';
    // 清空校准曲线记录值记录
    config_caliview_chart.data.datasets[1].data = [];
    chart_CentorPos.update();
});

//#endregion

//#region 报表生成视图相关数据及功能代码

//当前显示的试验明细缓存
let CurrentDetails = [];
//float类型正则表达式Pattern
let reg_float = /^[+]?\d+(\.\d+)?$/;
// 初始化明细列表对象
let objTable = document.getElementById("tblDetail");
// 初始化检索按钮对象
let btnSearch = document.getElementById("btnRptViewSearch");
// 初始化生成报表按钮对象
let btnGenerateRpt = document.getElementById("btnGenerateRpt");
// 初始化报表显示对象
let objPdfViewer = document.getElementById("pdfviewer");
/*
 * 功能: 检查一条试验明细数据的残余质量值
 * 参数:
 *       preweight:float - 烧前质量
 *       value:string    - 残余质量
 * 返回:
 *       true  - 输入字符合法且值符合指定条件
 *       false - 输入字符不合法或值不符合指定条件
 */
function checkPostWeightValue(preweight, value) {
    if (!reg_float.test(value)) { //输入字符不合法            
        return false;
    } else { //输入字符合法,但值不满足条件(残余质量 应大于0 且 不大于烧前质量)
        let fValue = parseFloat(value);
        if (Math.floor(fValue * 1000) <= 0 || parseInt(fValue * 1000) > parseInt(preweight * 1000)) {
            return false;
        } else {  //输入字符合法且值满足条件
            return true;
        }
    }
}

// 注册检索按钮事件
btnSearch.addEventListener('click', (event) => {
    // 检索指定编号的试验记录明细
    loadTestDetailFromSmpId(document.getElementById("txtProdId").value);
    // 若存在试验明细记录,则显示明细列表
    document.querySelector('.rptview-r2').style.display = 'grid';
});
// 注册明细行点击事件,以实现点击某一行而改变checkbox选中状态
document.getElementById("tblDetail").addEventListener("click", ({ target }) => {
    // 过滤掉点击文本框的情况
    if (target.nodeName === "INPUT") return;
    // 取得点击行的tr元素对象
    const tr = target.closest("tr");
    if (tr) {
        // 取得本行的checkbox对象
        const checkbox = tr.querySelector("input[type='checkbox']");
        if (checkbox) {
            // 修改checkbox的选中状态
            checkbox.checked = !checkbox.checked;
        }
    }
});
//添加试验明细"全选"事件监听
const chkSelectAll = document.getElementById("chkSelectAll");
chkSelectAll.addEventListener('change', (event) => {
    let items = document.getElementById("tblDetail").querySelectorAll("input[type='checkbox']");
    if (chkSelectAll.checked) {
        items.forEach(item => {
            item.checked = true;
        });
    } else {
        items.forEach(item => {
            item.checked = false;
        });
    }
});
// 添加生成汇总报告按钮点击事件
btnGenerateRpt.addEventListener('click', (event) => {
    //验证所有明细行的残余质量录入情况(输入值应大于0 且 满足浮点数格式)
    let weights = document.getElementById("tblDetail").querySelectorAll("input[type='text']");
    let bExist = false; //用于记录是否存在不满足要求的录入项(true:存在|false:不存在),初始默认为不存在
    for (let i = 0; i < weights.length; i++) {
        //从当前输入框对象Id获取对应数据项在当前明细数据缓存中的索引值(参见第256行)
        let idx = parseInt(weights[i].id.substring(13));
        if (!checkPostWeightValue(CurrentDetails[idx].preweight, weights[i].value)) {
            weights[i].style = "border:1px solid red;";
            bExist = true;
        } else {
            weights[i].style = "";
        }
    }
    //如果存在一项输入不满足要求则退出本次处理
    if (bExist) {
        return;
    }
    //验证是否刚好选择了5项试验明细
    let items = document.getElementById("tblDetail").querySelectorAll("input[type='checkbox']:checked");
    if (items.length !== 5) {
        $.messager.alert('信息提示', '请选择五项试验记录。', 'info');
        return;
    }
    //构造数据结构用于上传
    let updata = {
        indexes: [],
        details: []
    }
    items.forEach(item => updata.indexes.push(item.value));
    updata.details = CurrentDetails;
    //构造HTTP请求表头
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updata)
    }
    //设置按钮显示效果
    btnGenerateRpt.classList.add("disabledbutton");
    fetch("api/testmaster/getfinalreport", option)
        .then(response => response.json())
        .then(data => {
            //在客户端打开报表文件
            btnGenerateRpt.classList.remove("disabledbutton");
            objPdfViewer.src = data.param.downloadpath;
            objPdfViewer.classList.remove("pdfviewer-nonborder");
            objPdfViewer.classList.add("pdfviewer-border");
            // 设置报表浏览区域可见
            document.querySelector('.rptview-r3').style.display = 'grid';
        });
});

/* 功能: 增加一行试验明细 
 * 参数:
 *       data:JSON - 一条试验明细数据
 *       index     - 当前明细数据在缓存数组中的索引
 */
function appendNewDetail(data, index) {
    let newRow = objTable.insertRow(-1);
    // 生成单元格对象
    let Cell0 = newRow.insertCell(0); //checkbox
    let Cell1 = newRow.insertCell(1);  //试验编号
    let Cell2 = newRow.insertCell(2);  //温升TF1
    let Cell3 = newRow.insertCell(3); //温升TF2
    let Cell4 = newRow.insertCell(4);//失重率
    let Cell5 = newRow.insertCell(5); //火焰起火时间
    let Cell6 = newRow.insertCell(6); //火焰持续时间
    let Cell7 = newRow.insertCell(7);  //烧前质量
    let Cell8 = newRow.insertCell(8);  //烧后质量
    let Cell9 = newRow.insertCell(9);  //最高温度TF1
    let Cell10 = newRow.insertCell(10);  //最高温度TF2
    let Cell11 = newRow.insertCell(11);  //终平衡温度TF1
    let Cell12 = newRow.insertCell(12);  //终平衡温度TF2   
    // 设置单元格内容
    Cell0.innerHTML = `<input type="checkbox" value="${index}">`;
    Cell1.textContent = data.testid;
    Cell2.textContent = data.deltatf1;
    Cell3.textContent = data.deltatf2;
    //根据失重率数值范围设置显示属性
    let lostper = ((data.preweight - data.postweight) / data.preweight * 100).toFixed(1);
    let tmp = parseInt(lostper * 10);
    if (tmp <= 500 && tmp >= 0) { //达标
        Cell4.classList.remove("non-fullfilled");
        Cell4.classList.add("fullfilled");
    } else { //不达标
        Cell4.classList.remove("fullfilled");
        Cell4.classList.add("non-fullfilled");
    }
    Cell4.textContent = lostper;
    //根据火焰持续时间数值范围设置显示属性
    Cell5.textContent = data.flametime;
    Cell6.textContent = data.flameduration;
    if (data.flameduration === 0) { //达标            
        Cell6.classList.remove("non-fullfilled");
        Cell6.classList.add("fullfilled");
    } else {
        Cell6.classList.remove("fullfilled");
        Cell6.classList.add("non-fullfilled");
    }
    Cell7.textContent = data.preweight.toFixed(1); //toFixed 四舍五入至小数点后1位
    //增加试样残余质量录入框并设置初始值    
    Cell8.innerHTML = `<input type="text" id="txtPostWeight${index}" value="${data.postweight}">`;
    Cell9.textContent = data.maxtf1;
    Cell10.textContent = data.maxtf2;
    Cell11.textContent = data.finaltf1;
    Cell12.textContent = data.finaltf2;
}

/* 清空当前明细(保留首行) */
function clearDetails() {
    var i;
    var totallen = objTable.rows.length;
    for (i = totallen - 1; i >= 0; i--) {
        objTable.deleteRow(i);
    }
    CurrentDetails = [];
}

/* 加载试验明细 */
function loadTestDetails(data) {
    //清空先前的试验明细
    clearDetails();
    //清空先前的报告显示
    let objPdfViewer = document.getElementById("pdfviewer");
    objPdfViewer.src = "";
    objPdfViewer.classList.remove("pdfviewer-border");
    objPdfViewer.classList.add("pdfviewer-nonborder");
    //查无记录的情况
    if (data.length === 0) {
        document.getElementById("txtProductName").value = "";
        return;
    }
    //更新样品名称,试验日期,试验人员显示
    document.getElementById("txtProductName").value = data[0].productname;
    document.getElementById("txtTestDate").value = data[0].testdate;
    document.getElementById("txtOperator").value = data[0].operator;
    //添加新明细数据并更新缓存
    data.forEach((detail, index) => {
        //添加一行试验明细数据
        appendNewDetail(detail, index);
        //对已添加的一行数据,注册文本框change事件监听器,以自动计算失重率
        let item = document.getElementById(`txtPostWeight${index}`);
        //监听器方法在页面加载完成后执行
        item.addEventListener('change', (event) => {
            //此处tr索引为其在table中的索引,即包含标题行索引,减去1转换为tbody一致的索引
            let idx = item.closest('tr').rowIndex - 1;
            //使用正则表达式验证残余质量
            if (!reg_float.test(event.target.value)) {
                event.target.focus();
                return;
            } else {
                CurrentDetails[idx].postweight = parseFloat(event.target.value);
            }
            //计算并更新对应行的失重率显示(四舍五入至小数点后1位)
            let lostper = ((CurrentDetails[idx].preweight - CurrentDetails[idx].postweight) / CurrentDetails[idx].preweight * 100).toFixed(1);
            let cell = objTable.rows[idx].cells[4];
            if (parseInt(lostper * 10) <= 500) { //达标
                cell.classList.remove("non-fullfilled");
                cell.classList.add("fullfilled");
            } else { //不达标
                cell.classList.remove("fullfilled");
                cell.classList.add("non-fullfilled");
            }
            cell.textContent = lostper;
        });
    });
    //更新试验数据明细缓存
    CurrentDetails = data;
}

/*
 * 功能: 根据样品编号加载该样品的试验明细数据
 * 参数:
 *       prodId:string - 样品编号
 */
function loadTestDetailFromSmpId(prodId) {
    //设置按钮临时无效
    btnSearch.classList.add("disabledbutton");
    //提交查询请求        
    fetch(`api/testmaster/gettestinfo/${prodId}`)
        .then(response => response.json())
        .then(data => {
            // 回复按钮有效状态
            btnSearch.classList.remove("disabledbutton");
            loadTestDetails(data);
        });
}

//#endregion

//#region 客户端应用程序初始化代码

// 全局初始化函数
function appInitialize() {
    // 获取设备最新状态
    window.fetch("api/TestMaster/getapparatusinfo")
        .then(response => response.json())
        .then(data => {
            // 初始化数据模型
            var curDate = new Date();
            for (var idx = 0; idx < 4; idx++) {
                dmProxy_Master[idx].ambtemp = 25;
                dmProxy_Master[idx].ambhumi = 55;
                dmProxy_Master[idx].apparatusid = data[idx].innernumber;
                dmProxy_Master[idx].apparatusname = data[idx].apparatusname;
                dmProxy_Master[idx].checkdatef = data[idx].checkdatef.substring(0, 10);
                dmProxy_Master[idx].checkdatet = data[idx].checkdatet.substring(0, 10);
                dmProxy_Master[idx].constpower = data[idx].constpower;
                dmProxy_Master[idx].testaccord = "ISO 1182-2020";
                dmProxy_Master[idx].operator = "刘小马";
                dmProxy_Master[idx].testdate = curDate.getFullYear() + "年" + (curDate.getMonth() + 1) + "月" + curDate.getDate() + "日";
            }
        });
}

// 初始化Easy UI对话框默认属性
$.messager.defaults = { ok: '确定', cancel: '取消', modal: true };

// 创建客户端SignalR连接对象
var connection = new signalR.HubConnectionBuilder()
    .withUrl("/Notify")
    .configureLogging(signalR.LogLevel.Information)
    .build();
// 注册服务端实时消息处理函数
connection.on("MasterBroadCast", function (jsonObject) {
    // 解析服务器消息
    const data = JSON.parse(jsonObject);
    if (data.MasterId === 0) {
        /* 更新对应编号的控制器面板数据模型及显示 */
        // 更新试验控制器数据模型
        dmProxy_Master[data.MasterId].ambtemp = 25;
        dmProxy_Master[data.MasterId].ambhumi = 55;
        dmProxy_Master[data.MasterId].timer = data.Timer;
        dmProxy_Master[data.MasterId].tf1 = data.sensorDataCatch.Temp1;
        dmProxy_Master[data.MasterId].tf2 = data.sensorDataCatch.Temp2;
        dmProxy_Master[data.MasterId].ts = data.sensorDataCatch.TempSuf;
        dmProxy_Master[data.MasterId].tc = data.sensorDataCatch.TempCen;
        dmProxy_Master[data.MasterId].driftmean = data.caculateDataCatch.TempDriftMean;
        // 若试验控制器状态为[Recording]新增传感器历史数据及曲线数据
        if (data.MasterStatus === 3) {
            appendSensorData(data.MasterId, data);
        }
        // 如果有新的系统消息,则添加
        data.MasterMessages.forEach((item) => {
            appendSysMsgFromSigR(data.MasterId, item);
            // 如果包含持续火焰事件,则设置试验记录数据
            if (item.FlameDuration > 0) {
                // 设置试验记录界面checkbox及input文本框状态
                document.getElementById('chkFlame0').checked = true;
                document.getElementById('txtFlameTime0').disabled = !document.getElementById('chkFlame0').checked;
                document.getElementById('txtDurationTime0').disabled = !document.getElementById('chkFlame0').checked;
                // 设置试验现象编码
                dmProxy_Master0.pheno = setCharAt(dmProxy_Master0.pheno, 0, '1');
                // 设置数据模型对应值
                dmProxy_Master0.flametime = item.FlameTime;
                dmProxy_Master0.flameduration = item.FlameDuration;
            }
        });
        // 根据试验控制器状态更新面板工具栏命令按钮显示
        switch (data.MasterStatus) {
            case 0: // Idle
                // 激活【新建试验】按钮
                document.getElementById(`btnNewTest${data.MasterId}`).classList.remove("disabledbutton");
                // 激活【开始加热】按钮
                document.getElementById(`btnPowerOn${data.MasterId}`).classList.remove("disabledbutton");
                // 屏蔽【停止加热】按钮
                document.getElementById(`btnPowerOff${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【开始记录】按钮
                document.getElementById(`btnStartRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【停止记录】按钮
                document.getElementById(`btnStopRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【试验记录】按钮
                document.getElementById(`btnSetPheno${data.MasterId}`).classList.add("disabledbutton");
                break;
            case 1: // Preparing            
                // 屏蔽【开始记录】按钮
                document.getElementById(`btnStartRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【停止记录】按钮
                document.getElementById(`btnStopRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【试验记录】按钮
                document.getElementById(`btnSetPheno${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【开始加热】按钮
                document.getElementById(`btnPowerOn${data.MasterId}`).classList.add("disabledbutton");
                // 激活【停止加热】按钮
                document.getElementById(`btnPowerOff${data.MasterId}`).classList.remove("disabledbutton");
                // 设置试验条件指示
                document.getElementById(`imgIndicator${data.MasterId}`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/heat.png";
                break;
            case 2: // Ready
                // 激活【开始记录】按钮
                document.getElementById(`btnStartRecord${data.MasterId}`).classList.remove("disabledbutton");
                // 屏蔽【停止记录】按钮
                document.getElementById(`btnStopRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【试验记录】按钮
                document.getElementById(`btnSetPheno${data.MasterId}`).classList.add("disabledbutton");
                // 设置试验条件指示
                document.getElementById(`imgIndicator${data.MasterId}`).src = "./libs/jquery-easyui-1.10.16/themes/images/16/greencircle.png";
                break;
            case 3: // Recording
                // 屏蔽【新建试验】按钮
                document.getElementById(`btnNewTest${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【开始记录】按钮
                document.getElementById(`btnStartRecord${data.MasterId}`).classList.add("disabledbutton");
                // 激活【停止记录】按钮
                document.getElementById(`btnStopRecord${data.MasterId}`).classList.remove("disabledbutton");
                // 激活【试验记录】按钮
                document.getElementById(`btnSetPheno${data.MasterId}`).classList.remove("disabledbutton");
                break;
            case 4: // Complete                
                // 激活【新建试验】按钮
                document.getElementById(`btnNewTest${data.MasterId}`).classList.remove("disabledbutton");
                // 屏蔽【开始记录】按钮
                document.getElementById(`btnStartRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【停止记录】按钮
                document.getElementById(`btnStopRecord${data.MasterId}`).classList.add("disabledbutton");
                // 屏蔽【试验记录】按钮
                document.getElementById(`btnSetPheno${data.MasterId}`).classList.add("disabledbutton");
                // 重置本次试验界面显示
                resetMasterPanel(data.MasterId);
                // 弹出试验记录对话框
                $(`#dlgSetPheno${data.MasterId}`).dialog('open');
                break;
        }
    }
});
// 注册onClose事件处理函数,连接意外中断时自动重新建立连接
connection.onclose(async () => {
    await startTestSignalR();
});
sigRCon_Cali.onclose(async () => {
    await startCaliSignalR();
});
// 试验控制器SignalR连接函数
async function startTestSignalR() {
    try {
        await connection.start();
    } catch (err) {
        // 提示错误信息
        $.messager.alert('错误提示', err.message, 'error');
        // 5秒后重新尝试连接
        setTimeout(startTestSignalR, 5000);
    }
};
// 校准SignalR连接函数
async function startCaliSignalR() {
    try {
        await sigRCon_Cali.start();
    } catch (err) {
        // 提示错误信息
        $.messager.alert('错误提示', err.message, 'error');
        // 5秒后重新尝试连接
        setTimeout(startCaliSignalR, 5000);
    }
};
//#endregion

// 执行应用程序初始化
appInitialize();
// 启动试验控制器SignalR连接
// startTestSignalR();
// 启动校准SignalR连接
// startCaliSignalR();