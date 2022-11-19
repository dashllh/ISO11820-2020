﻿/* 该模块定义报表视图组件 */

class ReportView extends HTMLElement {
    /* 属性定义 */
    #txtProdId = null; //样品编号文本框对象
    #btnSearch = null; //明细检索按钮
    #btnGenerateRpt = null; //生成汇总报告按钮
    #tblTestDetail = null;  //试验明细列表对象
    #frmPdfViewer = null;   //汇总报表显示区域对象

    #CurrentDetails = [];  //当前显示的试验明细缓存

    #reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern

    constructor() {
        super();

        this.render();
    }

    /* 用户事件响应函数 */
    onSearchClick(event) {
        //获取用户输入的样品编号并提交
        this.loadTestDetailFromSmpId(this.#txtProdId.value);
    }

    onGenerateRptClick(event) {
        //验证所有明细行的残余质量录入情况(输入值应大于0 且 满足浮点数格式)
        let weights = this.#tblTestDetail.querySelectorAll("input[type='text']");
        let bExist = false; //用于记录是否存在不满足要求的录入项(true:存在|false:不存在),初始默认为不存在
        for (let i = 0; i < weights.length; i++) {
            //从当前输入框对象Id获取对应数据项在当前明细数据缓存中的索引值(参见第256行)
            let idx = parseInt(weights[i].id.substring(13));
            if (!this.checkPostWeightValue(this.#CurrentDetails[idx].preweight,weights[i].value)) {
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
        let items = this.#tblTestDetail.querySelectorAll("input[type='checkbox']:checked");
        if (items.length !== 5) {
            alert("只能选定5项试验记录,请重新选择。");
            return;
        }
        //构造数据结构用于上传
        let updata = {
            indexes: [],
            details:[]
        }
        items.forEach(item => updata.indexes.push(item.value));
        updata.details = this.#CurrentDetails;
        //构造HTTP请求表头
        let option = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updata)
        }
        //设置按钮显示效果
        this.#btnGenerateRpt.innerHTML = "报告生成中...";
        this.#btnGenerateRpt.classList.add("disabledbutton");
        //this.#btnGenerateRpt.innerHTML = "<div class='loader'></div>";
        fetch("api/testmaster/getfinalreport", option)
            .then(response => response.json())
            .then(data => {
                //在客户端打开报表文件
                //window.open(data.param.downloadpath, '_blank');
                this.#btnGenerateRpt.innerHTML = "生成汇总报告";
                this.#btnGenerateRpt.classList.remove("disabledbutton");
                this.#frmPdfViewer.src = data.param.downloadpath;
                this.#frmPdfViewer.classList.remove("pdfviewer-nonborder");
                this.#frmPdfViewer.classList.add("pdfviewer-border");
            });
    }

    /* 内部私有函数 */

    /*
     * 功能: 根据样品编号加载该样品的试验明细数据
     * 参数:
     *       prodId:string - 样品编号
     */
    loadTestDetailFromSmpId(prodId) {        
        //设置按钮显示效果
        //this.#btnSearch.innerHTML = "<div class='loader'></div>";
        this.#btnSearch.innerHTML = "检索中...";
        this.#btnSearch.classList.add("disabledbutton");
        //提交查询请求        
        fetch(`api/testmaster/gettestinfo/${prodId}`)
            .then(response => response.json())
            .then(data => {
                this.#btnSearch.innerHTML = "检索";
                this.#btnSearch.classList.remove("disabledbutton");
                this.loadTestDetails(data);
            });
    }

    /*
     * 功能: 检查一条试验明细数据的残余质量值
     * 参数:
     *       preweight:float - 烧前质量
     *       value:string    - 残余质量
     * 返回:
     *       true  - 输入字符合法且值符合指定条件
     *       false - 输入字符不合法或值不符合指定条件
     */
    checkPostWeightValue(preweight, value) {
        console.log(preweight);
        if (!this.#reg_float.test(value)) { //输入字符不合法            
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

    /* 重载函数 */
    connectedCallback() {
        if (this.#btnSearch === null) {
            this.#btnSearch = document.getElementById("btnSearch");
            this.#btnSearch.addEventListener('click', this.onSearchClick.bind(this));
        }
        if (this.#btnGenerateRpt === null) {
            this.#btnGenerateRpt = document.getElementById("btnGenerateFinalReport");
            this.#btnGenerateRpt.addEventListener('click', this.onGenerateRptClick.bind(this));
        }
        if (this.#tblTestDetail === null) {
            this.#tblTestDetail = document.getElementById("tblDetail");
            //向明细记录行添加点击事件,以实现点击某一行而改变checkbox选中状态
            this.#tblTestDetail.addEventListener("click", ({ target }) => {
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
        }
        if (this.#frmPdfViewer === null) {
            this.#frmPdfViewer = document.getElementById("pdfviewer");
        }
        //添加试验明细"全选"事件监听
        const chkSelectAll = document.getElementById("chkSelectAll");
        chkSelectAll.addEventListener('change', (event) => {
            let items = this.#tblTestDetail.querySelectorAll("input[type='checkbox']");
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

        //添加样品编号搜索框回车响应事件
        if (this.#txtProdId === null) {
            this.#txtProdId = document.getElementById("txtProductId");
            this.#txtProdId.addEventListener('keydown', (event) => {
                if (event.keyCode === 13) {
                    this.loadTestDetailFromSmpId(this.#txtProdId.value);
                }
            });
        }
    }

    /* 加载试验明细 */
    loadTestDetails(data) {
        //清空先前的试验明细
        this.clearDetails();
        //清空先前的报告显示
        this.#frmPdfViewer.src = "";
        this.#frmPdfViewer.classList.remove("pdfviewer-border");
        this.#frmPdfViewer.classList.add("pdfviewer-nonborder");        
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
            this.appendNewDetail(detail, index);
            //对已添加的一行数据,注册文本框change事件监听器,以自动计算失重率
            let item = document.getElementById(`txtPostWeight${index}`);
            //监听器方法在页面加载完成后执行
            item.addEventListener('change', (event) => {
                //此处tr索引为其在table中的索引,即包含标题行索引,减去1转换为tbody一致的索引
                let idx = item.closest('tr').rowIndex - 1; 
                //使用正则表达式验证残余质量
                if (!this.#reg_float.test(event.target.value)) {
                    event.target.focus();
                    return;
                } else {
                    this.#CurrentDetails[idx].postweight = parseFloat(event.target.value);
                }
                //计算并更新对应行的失重率显示(四舍五入至小数点后1位)
                let lostper = ((this.#CurrentDetails[idx].preweight - this.#CurrentDetails[idx].postweight) / this.#CurrentDetails[idx].preweight * 100).toFixed(1);                
                let cell = this.#tblTestDetail.rows[idx].cells[10];
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
        this.#CurrentDetails = data;
    }

    /* 功能: 增加一行试验明细 
     * 参数:
     *       data:JSON - 一条试验明细数据
     *       index     - 当前明细数据在缓存数组中的索引
     */
    appendNewDetail(data,index) {
        let newRow = this.#tblTestDetail.insertRow(-1);        
        let Cell2 = newRow.insertCell(0);  //试验编号
        let Cell3 = newRow.insertCell(1);  //烧前质量
        let Cell4 = newRow.insertCell(2);  //烧后质量
        let Cell5 = newRow.insertCell(3);  //最高温度TF1
        let Cell6 = newRow.insertCell(4);  //最高温度TF2
        let Cell7 = newRow.insertCell(5);  //终平衡温度TF1
        let Cell8 = newRow.insertCell(6);  //终平衡温度TF2
        let Cell9 = newRow.insertCell(7);  //温升TF1
        let Cell10 = newRow.insertCell(8); //温升TF2
        let Cell11 = newRow.insertCell(9); //火焰持续时间
        let Cell12 = newRow.insertCell(10);//失重率
        let Cell1 = newRow.insertCell(11); //checkbox
        Cell1.innerHTML   = `<input type="checkbox" value="${index}">`;
        Cell2.textContent = data.testid;
        Cell3.textContent = data.preweight.toFixed(1); //toFixed 四舍五入至小数点后1位
        //增加试样残余质量录入框并设置初始值
        Cell4.innerHTML   = `<input type="text" id="txtPostWeight${index}" value="${data.postweight}">`;
        Cell5.textContent = data.maxtf1;
        Cell6.textContent = data.maxtf2;
        Cell7.textContent = data.finaltf1;
        Cell8.textContent = data.finaltf2;
        Cell9.textContent = data.deltatf1;
        Cell10.textContent = data.deltatf2;
        //根据火焰持续时间设置显示属性
        Cell11.textContent = data.flameduration;
        if (data.flameduration === 0) { //达标            
            Cell11.classList.remove("non-fullfilled");
            Cell11.classList.add("fullfilled");
        } else { 
            Cell11.classList.remove("fullfilled");
            Cell11.classList.add("non-fullfilled");
        }
        //根据失重率设置显示属性
        let lostper = ((data.preweight - data.postweight) / data.preweight * 100).toFixed(1);    
        let tmp = parseInt(lostper * 10);
        if (tmp <= 500 && tmp >= 0) { //达标
            Cell12.classList.remove("non-fullfilled");
            Cell12.classList.add("fullfilled");
        } else { //不达标
            Cell12.classList.remove("fullfilled");
            Cell12.classList.add("non-fullfilled");
        }
        Cell12.textContent = lostper; 
    }

    /* 清空当前明细(保留首行) */
    clearDetails() {
        var i;
        var totallen = this.#tblTestDetail.rows.length;
        for (i = totallen - 1; i >= 0; i--) {
            this.#tblTestDetail.deleteRow(i);
        }
        this.#CurrentDetails = [];
    }

    get template() {
        return `
            <!-- 试验信息检索条件 -->
            <div class="criteria">
                <div>
                    <label for="txtProductId">样品编号:</label>
                    <input type="text" name="txtProductId" id="txtProductId">
                    <button id="btnSearch" class="cmdbutton">检索</button>
                </div>
                <div>
                    <label for="txtProductName">样品名称:</label>
                    <input type="text" name="txtProductName" id="txtProductName" disabled>
                </div>

            </div>
            <!-- 试验信息明细列表 -->
            <div class="detail">
                <table>
                    <thead>
                        <tr>                            
                            <th>试验编号</th>
                            <th>烧前质量(g)</th>
                            <th>烧后质量(g)</th>
                            <th>最高温度TF1(℃)</th>
                            <th>最高温度TF2(℃)</th>
                            <th>终平衡温度TF1(℃)</th>
                            <th>终平衡温度TF2(℃)</th>
                            <th>温升TF1(℃)</th>
                            <th>温升TF2(℃)</th>
                            <th>火焰持续时间(s)</th>
                            <th>失重率(%)</th>
                            <th><input id="chkSelectAll" type="checkbox"><label for="chkSelectAll" style="cursor: pointer;">全选</label></th>
                        </tr>
                    </thead>
                    <tbody id="tblDetail">
                    </tbody>
                </table>
            </div>
            <!-- 操作按钮 -->
            <div class="action">
                <button id="btnGenerateFinalReport" class="cmdbutton">生成汇总报告</button>
            </div>
            <div class="reportviewer">
                <iframe id="pdfviewer" class="pdfviewer-nonborder" width="100%" height="640px">
                </iframe>
            </div>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('view-report', ReportView);

export { ReportView }