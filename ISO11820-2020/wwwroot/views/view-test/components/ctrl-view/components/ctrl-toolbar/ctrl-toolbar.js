/* 导入依赖模块 */
import { SendClientCmd } from "../../../../../../App.js";

//导入新建试验对话框组件
import { NewTest } from "../ctrl-newtest/ctrl-newtest.js"

//导入设备参数设置对话框组件
import { SetParam } from "../ctrl-setparam/ctrl-setparam.js"


class MasterToolBar extends HTMLElement {
    /* 属性定义 */
    #id = -1;     //工具栏对象所属的控制器面板ID
    #role = '';   //当前用户权限
    #items = [];  //工具栏功能按钮集合
    //按钮组件对象
    #btnNewTest = null;
    #btnStartTimer = null;
    #btnStopTimer = null;  
    #btnSetParam = null;
    /* 对话框组件对象 */
    //新建试验对话框
    #dlgNewTest = null;
    //设备参数设置对话框
    #dlgSetParam = null;
    //按钮显示标签
    #item_newTest = '';
    #item_startTimer = '';
    #item_stopTimer = '';
    #item_configParam = '';
    #item_stopHeating = '';

    /*
        功能: 构造函数
        参数: 
            role:string - 当前登录用的系统角色,由服务器根据用户登录信息确定并返回至客户端
                          角色类型: 'operator','manager'
    */
    constructor(id,role) {
        super();

        this.#id = id;
        this.#role = role;  

        this.render();

        this.#dlgNewTest = new NewTest(this.#id);
        this.appendChild(this.#dlgNewTest); 

        this.#dlgSetParam = new SetParam(this.#id);
        this.appendChild(this.#dlgSetParam); 
    }

    /* 事件监听器函数 */
    //新建试验
    newTest(event) {
        this.#dlgNewTest.initViewModel();
        //弹出新建试验对话框        
        this.#dlgNewTest.style.display = 'block';
    }
    //开始计时
    startTimer(event) {
        SendClientCmd('starttimer', this.#id);
    }

    //停止计时
    stopTimer(event) {

    }

    //设备参数设置
    configParam(event) {
        //弹出新建试验对话框        
        this.#dlgSetParam.style.display = 'block';        
    }

    /* 重载方法 */
    attributeChangedCallback() {

    }

    connectedCallback() {        
        /* 注册事件监听器函数 */
        //新建试验
        if (this.#btnNewTest === null) {
            this.#btnNewTest = document.getElementById(`newTest${this.#id}`);
            this.#btnNewTest.addEventListener('click', this.newTest.bind(this));
        }
        //开始计时
        if (this.#btnStartTimer === null) {
            this.#btnStartTimer = document.getElementById(`startTimer${this.#id}`);
            this.#btnStartTimer.addEventListener('click', this.startTimer.bind(this));
        }
        //停止计时
        if (this.#btnStopTimer === null) {
            this.#btnStopTimer = document.getElementById(`stopTimer${this.#id}`);
            this.#btnStopTimer.addEventListener('click', this.stopTimer.bind(this));
        }       
        //参数设置
        if (this.#btnSetParam === null) {
            this.#btnSetParam = document.getElementById(`configParam${this.#id}`);
            this.#btnSetParam.addEventListener('click', this.configParam.bind(this));
        }     
    }

    disconnectedCallback() {

    }

    /*
     * 功能: 设置工具栏按钮可用状态
     * 参数:
     *       button:string - 按钮名称
     *       status:bool   - 可用或不可用(true:可用 | false:不可用)
     */
    setButtonStatus(button, status) {
        switch (button) {
            case 'newtest':
                this.#btnNewTest.setAttribute('disabled', status ? "false" : "true");
                break;
            case 'starttimer':
                this.#btnStartTimer.setAttribute('disabled', status ? "false" : "true");
                break;
            case 'stoptimer':
                this.#btnStopTimer.setAttribute('disabled', status ? "false" : "true");
                break;
            default:
        }
    }

    /*
     * 功能: 初始化功能按钮状态
     */
    initButtonStatus() {
        //初始化功能按钮状态
        this.#btnStartTimer.setAttribute('disabled', "true");
        this.#btnStopTimer.setAttribute('disabled', "true");
    }

    /* 组件HTML模板 */
    get template() {
        /* 功能按钮常量字符串定义 */
        //新建试验
        this.#item_newTest = `
                    <div id="newTest${this.#id}" class="toolbar-item" disabled="false">
                        <img src="./assets/images/newtest.ico" alt="新建试验">
                        <a href="#">新建试验</a>
                    </div>
                    `;
        //开始计时
        this.#item_startTimer = `
                    <div id="startTimer${this.#id}" class="toolbar-item" disabled="true">
                        <img src="./assets/images/start2.png" alt="开始计时">
                        <a href="#">开始计时</a>
                    </div>
                    `;
        //停止计时
        this.#item_stopTimer = `
                    <div id="stopTimer${this.#id}" class="toolbar-item" disabled="true">
                        <img src="./assets/images/stop1.png" alt="停止计时">
                        <a href="#">停止计时</a>
                    </div>
                    `;
        //参数设置
        this.#item_configParam = `
                    <div id="configParam${this.#id}" class="toolbar-item" disabled="">
                        <img src="./assets/images/stop1.png" alt="参数设置">
                        <a href="#">参数设置</a>
                    </div>
                    `;

        //停止升温
        this.#item_stopHeating = `
                    <div id="stopHeating${this.#id}" class="toolbar-item" disabled="true">
                        <img src="./assets/images/stop1.png" alt="停止加热">
                        <a href="#">停止加热</a>
                    </div>
                    `;

        /* 根据登录角色构造工具栏功能按钮组合 */
        switch (this.#role) {
            case '1':  //试验员权限
                this.#items.push(this.#item_newTest);
                this.#items.push(this.#item_startTimer);
                this.#items.push(this.#item_stopTimer);
                this.#items.push(this.#item_stopHeating);
                break;
            case '0':   //试验管理员权限
                this.#items.push(this.#item_newTest);
                this.#items.push(this.#item_startTimer);
                this.#items.push(this.#item_stopTimer);
                this.#items.push(this.#item_configParam);
                this.#items.push(this.#item_stopHeating);
                break;
        }

        return `              
                ${this.#items.join('')}                
        `;
    }

    /* 渲染函数 */
    render() {
        this.innerHTML = this.template;
    }

}

customElements.define('ctrl-toolbar', MasterToolBar);

export { MasterToolBar }