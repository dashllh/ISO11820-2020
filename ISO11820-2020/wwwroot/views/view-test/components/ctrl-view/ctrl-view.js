//导入全局变量
import { GlobalParam } from "../../../../App.js";

// 导入实时值显示组件
import { RealTimeItem } from "./components/rt-item/rt-item.js"
// 导入控制面板工具栏组件
import { MasterToolBar } from "./components/ctrl-toolbar/ctrl-toolbar.js"
// 导入控制面板温度图表组件
import { TempChart } from "./components/ctrl-chart/ctrl-chart.js"
//导入消息输出组件
import { MasterOutput } from "./components/ctrl-output/ctrl-output.js"
//导入试验后信息录入对话框
import { DlgPostTest } from "./components/ctrl-posttest/ctrl-posttest.js"

/* 该类型定义试验控制器客户端操作面板 */
class CtrlView extends HTMLElement {
    /* 属性定义 */
    //控制器面板ID
    #ctrlId = 0; //控制面板ID
    //子控件对象引用
    #toolBar = null;    //工具栏
    #timer = null;      //试验计时
    #temp1 = null;      //炉内温度1
    #temp2 = null;      //炉内温度2
    #tempSuf = null;    //表面温度
    #tempCen = null;    //中心温度
    #tempDrift = null;  //温度漂移
    #chart = null;      //图表控件

    #Output = null;     //消息输出组件
    #tabOutput = null;  //消息输出组件的内部Tab组件
    #msgOutput = null;  //控制器消息列表
    #dataOutput = null; //传感器数据列表

    #dlgPostTest = null; //试验完成后信息录入对话框

    constructor(id) {
        super();

        // 初始化属性
        this.#ctrlId = id;
        /* 初始化子控件引用 */
        //工具栏
        this.#toolBar = new MasterToolBar(this.#ctrlId, GlobalParam.LoginUserType);        
        //实时值Item
        this.#timer = new RealTimeItem('试验计时(s)', '0');
        this.#timer.classList.add('timer');

        this.#temp1 = new RealTimeItem('炉内温度1(℃)', '1');
        this.#temp1.classList.add('temp1');

        this.#temp2 = new RealTimeItem('炉内温度2(℃)', '1');
        this.#temp2.classList.add('temp2');

        this.#tempSuf = new RealTimeItem('表面温度(℃)', '1');
        this.#tempSuf.classList.add('tempsuf');

        this.#tempCen = new RealTimeItem('中心温度(℃)', '1');
        this.#tempCen.classList.add('tempcen');

        this.#tempDrift = new RealTimeItem('温度漂移(℃)', '1');
        this.#tempDrift.classList.add('tempdrift');

        //温度图表
        this.#chart = new TempChart(this.#ctrlId);
        //构造消息输出组件
        this.#Output = new MasterOutput(this.#ctrlId);
        this.#tabOutput = this.#Output.getInnerTabCtrl();
        this.#msgOutput = this.#tabOutput.getMsgList();  //控制器消息
        this.#dataOutput = this.#tabOutput.getDataList();//传感器数据列表

        /* 组装该控制面板各个子控件 */
        //工具栏
        this.appendChild(this.#toolBar);
        //实时值
        this.appendChild(this.#timer);
        this.appendChild(this.#temp1);
        this.appendChild(this.#temp2);
        this.appendChild(this.#tempSuf);
        this.appendChild(this.#tempCen);
        this.appendChild(this.#tempDrift);
        //温度图表
        this.appendChild(this.#chart);
        //消息输出
        this.appendChild(this.#Output);

        //试验后信息录入对话框
        this.#dlgPostTest = new DlgPostTest(this.#ctrlId);
        this.appendChild(this.#dlgPostTest);                
    }

    /* 文档回调函数 */
    connectedCallback() {

    }

    /* 接口方法定义 */

    /*
        功能: 更新控制器视图显示(只处理试验控制器返回的消息)
        参数:
            model:JSON - 视图模型数据
    */
    updateDisplay(model) {        
        this.#timer.Value     = model.Timer;                   //试验计时
        this.#temp1.Value     = model.sensorDataCatch.Temp1;   //炉内温度1
        this.#temp2.Value     = model.sensorDataCatch.Temp2;   //炉内温度2
        this.#tempSuf.Value   = model.sensorDataCatch.TempSuf; //试样表面温度
        this.#tempCen.Value   = model.sensorDataCatch.TempCen; //试样中心温度
        this.#tempDrift.Value = model.caculateDataCatch.TempDriftMean; //炉内温度1与炉内温度2温度漂移平均值
        //如果试验控制器为[Recording]状态,则增加传感器数据记录并刷新曲线图表显示
        //if (model.MasterStatus === 3) {
        //    this.#dataOutput.appendNewData(model);
        //    this.#chart.refresh(model.Timer, this.#temp1.Value, this.#temp2.Value,
        //        this.#tempSuf.Value, this.#tempCen.Value); 
        //}     
        /* 根据控制器当前状态设置控制器显示 */
        switch (model.MasterStatus) {
            case 0:    //Idle
                //控制器状态从[Preparing]转换为[Idle]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 1) {
                    console.log("Preparing -> Idle");
                }
                break;
            case 1:    //Preparing
                //控制器状态从[Idle]转换为[Preparing]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 0) {
                    console.log("Idle -> Preparing");
                    //设置"开始计时"按钮为有效状态
                    //this.#toolBar.setButtonStatus('starttimer', true);
                }
                //控制器状态从[Recording]转换为[Preparing]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 3) {
                    console.log("Recording -> Preparing");
                    //设置"开始计时"按钮为有效状态
                    //...
                }
                //[Complete]转换为[Preparing]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 4) {
                    console.log("Complete -> Preparing");
                    //设置"开始计时"按钮为有效状态
                    //...
                }
                break;
            case 2:    //Ready
                //控制器状态从[Preparing]转换为[Ready]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 1) {
                    console.log("Preparing -> Ready");
                    //设置"开始计时"按钮为有效状态
                    this.#toolBar.setButtonStatus('starttimer', true);
                }
                break;
            case 3:    //Recording
                //控制器状态从[Ready]转换为[Recording]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 2) {
                    console.log("Ready -> Recording");
                    //设置"开始计时"按钮为无效状态
                    this.#toolBar.setButtonStatus('starttimer', false);
                    //设置"停止计时"按钮为有效状态
                    this.#toolBar.setButtonStatus('stoptimer', true);
                }
                //增加传感器数据记录并刷新曲线图表显示
                this.#dataOutput.appendNewData(model);
                this.#chart.refresh(model.Timer, this.#temp1.Value, this.#temp2.Value,
                    this.#tempSuf.Value, this.#tempCen.Value); 
                break;
            case 4:    //Complete
                //控制器状态从[Recording]转换为[Complete]的情况
                if (GlobalParam.TestMasters[model.MasterId].Status === 3) {
                    console.log("Recording -> Complete");
                    /* 本次试验结束,清空显示 */
                    //消息列表
                    this.#msgOutput.clear();
                    //传感器列表
                    this.#dataOutput.clear();
                    //曲线图表
                    this.#chart.resetChart();
                    //弹出试验后录入信息对话框        
                    this.#dlgPostTest.style.display = 'block';
                }
                break;
            default:
        }
        //同步客户端试验控制器状态
        GlobalParam.TestMasters[model.MasterId].Mode = model.MasterMode;
        GlobalParam.TestMasters[model.MasterId].Status = model.MasterStatus;        
    }

    /*
     * 功能: 处理服务器端Action API的返回消息
     * 参数:
     *       msg:JSON - 服务器端Action API的返回消息
     */
    handleControllerMsg(msg) {
        this.#msgOutput.appendNewMsg(msg.param.time, msg.msg);
    }

    get template() {
        return `            
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('ctrl-view', CtrlView);

export { CtrlView }