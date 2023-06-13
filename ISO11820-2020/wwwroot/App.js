//#region 通用公共函数定义

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

//#endregion

//#region 用于与服务器端通信的客户端应用主数据模型(四个试验控制器独立数据模型)

let dmMaster0 = {
    // 环境
    ambtemp: 25,       // 环境温度
    ambhumi: 55,       // 环境湿度
    // 设备
    apparatusid: '',   // 设备编号
    apparatusname: '', // 设备名称
    checkdate: '',     // 检定日期
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

//#endregion

//#region 样品试验视图对话框相关数据及功能代码

/* ============= 新建试验对话框 =============*/
// 一号炉新建试验对话框ViewModel
let vmNewTest0 = {
    ambtemp: 0.0,// 环境温度
    ambhumi: 0.0,// 环境湿度
    prodname: '',// 产品名称
    prodspec: '',// 产品规格型号
    prodheight: 0.0,// 产品高度
    proddiameter: 0.0,// 产品直径
    prodweight: 0.0,// 产品质量
    specimanid: '',// 试样编号
    testid: '',// 试验编号(样品标识号)
    testdate: '',// 试验日期
    testaccord: '',// 检验依据
    testmemo: '',// 试验备注
    operator: '',// 试验人员
    apparatusid: '',// 设备编号
    apparatusname: '',// 设备名称
    checkdate: ''// 设备检定日期

}
// 二号炉新建试验对话框ViewModel
let vmNewTest1 = {
    ambtemp: 0.0,// 环境温度
    ambhumi: 0.0,// 环境湿度
    prodname: '',// 产品名称
    prodspec: '',// 产品规格型号
    prodheight: 0.0,// 产品高度
    proddiameter: 0.0,// 产品直径
    prodweight: 0.0,// 产品质量
    specimanid: '',// 试样编号
    testid: '',// 试验编号(样品标识号)
    testdate: '',// 试验日期
    testaccord: '',// 检验依据
    operator: '',// 试验人员
    apparatusid: '',// 设备编号
    apparatusname: '',// 设备名称
    checkdate: '',// 设备检定日期
    testmemo: ''// 试验备注
}
// 三号炉新建试验对话框ViewModel
let vmNewTest2 = {
    ambtemp: 0.0,// 环境温度
    ambhumi: 0.0,// 环境湿度
    prodname: '',// 产品名称
    prodspec: '',// 产品规格型号
    prodheight: 0.0,// 产品高度
    proddiameter: 0.0,// 产品直径
    prodweight: 0.0,// 产品质量
    specimanid: '',// 试样编号
    testid: '',// 试验编号(样品标识号)
    testdate: '',// 试验日期
    testaccord: '',// 检验依据
    operator: '',// 试验人员
    apparatusid: '',// 设备编号
    apparatusname: '',// 设备名称
    checkdate: '',// 设备检定日期
    testmemo: ''// 试验备注
}
// 四号炉新建试验对话框ViewModel
let vmNewTest3 = {
    ambtemp: 0.0,// 环境温度
    ambhumi: 0.0,// 环境湿度
    prodname: '',// 产品名称
    prodspec: '',// 产品规格型号
    prodheight: 0.0,// 产品高度
    proddiameter: 0.0,// 产品直径
    prodweight: 0.0,// 产品质量
    specimanid: '',// 试样编号
    testid: '',// 试验编号(样品标识号)
    testdate: '',// 试验日期
    testaccord: '',// 检验依据
    operator: '',// 试验人员
    apparatusid: '',// 设备编号
    apparatusname: '',// 设备名称
    checkdate: '',// 设备检定日期
    testmemo: ''// 试验备注
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
            ApparatusChkDate: dmMaster0.checkdate,
            ConstPower: dmMaster0.constpower,
            Memo: dmMaster0.testmemo
        })
    }
    fetch('api/testmaster/newtest/0', option)
        .then(response => response.json())
        .then(data => console.log(data));
});

// 【开始计时】工具栏按钮
// ...

// 【停止计时】工具栏按钮
// ...

// 【试验记录】工具栏按钮
document.getElementById('btnSetPheno0').addEventListener('click', (event) => {
    $('#dlgSetPheno0').dialog('open');
});
// 试验记录对话框【取消】按钮
document.getElementById('btnCancelPheno0').addEventListener('click', (event) => {
    $('#dlgSetPheno0').dialog('close');
});
// 试验记录对话框【确定】按钮
// ...

// 【参数设置】工具栏按钮
document.getElementById('btnSetParam0').addEventListener('click', (event) => {
    $('#dlgSetParam0').dialog('open');
});
// 参数设置对话框【取消】按钮
document.getElementById('btnCancelSetParam0').addEventListener('click', (event) => {
    $('#dlgSetParam0').dialog('close');
});
// 参数设置对话框【确定】按钮
// ...


// 【停止加热】工具栏按钮
// ...

// 试验现象 - 持续火焰checkbox
document.getElementById('chkFlame0').addEventListener('change', (event) => {
    document.getElementById('txtFlameTime0').disabled = !document.getElementById('chkFlame0').checked;
    document.getElementById('txtDurationTime0').disabled = !document.getElementById('chkFlame0').checked;
    dmProxy_Master0.pheno = setCharAt(dmProxy_Master0.pheno, 0, document.getElementById('chkFlame0').checked ? '1' : '0');
});

//#endregion

//#region 一号试验控制器相关数据绑定

// 实现数据模型到界面的绑定
let dmhandler_master0 = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const item = document.querySelector(`[data-bind-master0=${property}]`);
            if (item !== null) {
                item.value = value;
            }
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
        console.log(dmMaster0);
    });
});

// 测试代码:测试数据绑定
dmProxy_Master0.ambtemp = 25;
dmProxy_Master0.ambhumi = 55;
dmProxy_Master0.timer = 0;
dmProxy_Master0.tf1 = 8888;
dmProxy_Master0.tf2 = 8888;
dmProxy_Master0.ts = 8888;
dmProxy_Master0.tc = 8888;
dmProxy_Master0.driftmean = 8888;

dmProxy_Master0.apparatusid = "1014";
dmProxy_Master0.apparatusname = "建筑材料不燃性试验装置";
dmProxy_Master0.checkdate = "2023年12月12日";
dmProxy_Master0.constpower = 15;
dmProxy_Master0.testaccord = "ISO 1182-2020";
dmProxy_Master0.operator = "刘小马";
dmProxy_Master0.testdate = "2023年6月12日";

//#endregion

//#region 系统校准视图数据及功能代码

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
new Chart(document.getElementById('caliTempChart'), config_caliview_chart);

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
// 注册检索按钮事件
btnSearch.addEventListener('click', (event) => {
    // 检索指定编号的试验记录明细
    // loadTestDetailFromSmpId(document.getElementById("txtProdId").value);
    // 若存在试验明细记录,则显示明细列表
    document.querySelector('.rptview-r2').style.display = 'grid';
});
// 注册生成报表按钮点击事件
btnGenerateRpt.addEventListener('click', (event) => {
    document.querySelector('.rptview-r3').style.display = 'grid';
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

/* 加载试验明细 */
function loadTestDetails(data) {
    //清空先前的试验明细
    this.clearDetails();
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
    //更新样品名称显示
    document.getElementById("txtProductName").value = data[0].productname;
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
            let cell = objTable.rows[idx].cells[10];
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
            console.log(data);
            // 初始化数据模型
            dmProxy_Master0.apparatusid = data[0].innernumber;
            dmProxy_Master0.apparatusname = data[0].apparatusname;
            dmProxy_Master0.checkdate = data[0].checkdatet.substring(0, 10);
            dmProxy_Master0.constpower = data[0].constpower;
            dmProxy_Master0.testaccord = "ISO 1182-2020";
            dmProxy_Master0.operator = "刘小马";
            dmProxy_Master0.testdate = "2023年6月12日";
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
    // 处理消息: 根据试验控制器编号更新对应的数据模型
    switch (model.MasterId) {
        case 0:
            dmProxy_Master0.ambtemp = 25;
            dmProxy_Master0.ambhumi = 55;
            dmProxy_Master0.timer = model.timer;
            dmProxy_Master0.tr1 = model.sensorDataCatch.Temp1;
            dmProxy_Master0.tr2 = model.sensorDataCatch.Temp2;
            dmProxy_Master0.ts = model.sensorDataCatch.TempSuf;
            dmProxy_Master0.tc = model.sensorDataCatch.TempCen;
            dmProxy_Master0.driftmean = model.caculateDataCatch.TempDriftMean;
            // 添加曲线数据
            // ...
            // 新增传感器历史数据
            // ...
            // 如果有新的系统消息,则添加
            // ...
            break;
        case 1:

            break;
        case 2:

            break;
        case 3:

            break;
    }
});
// 注册onClose事件处理函数
connection.onclose(async () => {
    await start();
});
// SignalR连接函数
async function start() {
    try {
        await connection.start();
    } catch (err) {
        // 提示错误信息
        $.messager.alert('错误提示', err.message, 'error');
        // 5秒后重新尝试连接
        setTimeout(start, 5000);
    }
};
// 启动连接
// start();

//#endregion

appInitialize();