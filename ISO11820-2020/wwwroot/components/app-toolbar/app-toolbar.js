/*
    功能: 该模块定义应用程序主视图工具栏组件
*/

//导入全局模块
import { SendClientCmd } from "../../App.js"

class AppToolBar extends HTMLElement {
    /* 属性定义 */
    #objSvgMissionList = null;
    #objMissionList = null;
    #boolMissionListShow = false;

    #objTestView = null;   //试验视图对象
    #objReportView = null; //报表视图对象
    #objQueryView = null;  //查询视图对象

    constructor() {
        super();

        this.render();
    }

    // 重载函数
    connectedCallback() {
        /* 初始化组件内部对象引用 */
        // 任务列表组件
        if (this.#objMissionList === null) {
            this.#objMissionList = document.getElementById('_idMissionList');
        }
        // 任务列表图标点击事件
        if (this.#objSvgMissionList === null) {
            this.#objSvgMissionList = document.getElementById('_svgidMissionList');
            this.#objSvgMissionList.addEventListener('click', (event) => {
                if (this.#boolMissionListShow === false) {
                    this.#objMissionList.style.display = 'block';
                    this.#boolMissionListShow = true;
                } else {
                    this.#objMissionList.style.display = 'none';
                    this.#boolMissionListShow = false;
                }
            });
        }
        //选择试验视图
        if (this.#objTestView === null) {
            this.#objTestView = document.getElementById('_idTbTestView');
            this.#objTestView.addEventListener('click', (event) => {
                SendClientCmd('changeview','TestView');
            });
        }
        //选择报表视图
        if (this.#objReportView === null) {
            this.#objReportView = document.getElementById('_idTbReportView');
            this.#objReportView.addEventListener('click', (event) => {
                SendClientCmd('changeview', 'ReportView');
            });
        }
        //选择查询视图
        if (this.#objQueryView === null) {
            this.#objQueryView = document.getElementById('_idTbQueryView');
            this.#objQueryView.addEventListener('click', (event) => {
                SendClientCmd('changeview', 'QueryView');
            });
        }

        // 用户操作组件
        //...

        // 用户操作图标点击事件
        //...
    }

    get template() {
        return `                
                <span class="apptb-brand">建筑材料不燃性试验系统 版本 2.0</span>
                <!-- 功能按钮区域 -->
                <div class="apptb-btn-view">
                    <input type="radio" name="app-toolbar-item" id="_idTbTestView" checked>
                    <label for="_idTbTestView">试验视图</label>
                    <input type="radio" name="app-toolbar-item" id="_idTbReportView">
                    <label for="_idTbReportView">报表视图</label>
                    <input type="radio" name="app-toolbar-item" id="_idTbQueryView">
                    <label for="_idTbQueryView">查询视图</label>
                </div>
                <!-- 用户信息区域 -->
                <div class="apptb-btn-func">
                    <!-- 任务列表图标 -->
                    <svg id="_svgidMissionList" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-card-list" viewBox="0 0 16 16">
                        <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z" />
                        <path d="M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" />
                    </svg>
                    <div id="_idMissionList" class="mission-list">
                        <ul>
                            <li><a href="#">检验任务</a></li>
                            <li><a href="#">检验任务</a></li>
                            <li><a href="#">检验任务</a></li>
                            <li><a href="#">检验任务</a></li>
                        </ul>
                    </div>
                    <!-- 功能操作图标 -->
                    <svg id="_svgidUserInfo" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-person"
                        viewBox="0 0 16 16">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                    </svg>
                </div>
                `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('app-toolbar', AppToolBar);

export { AppToolBar }