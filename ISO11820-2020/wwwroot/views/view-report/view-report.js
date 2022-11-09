/* 该模块定义报表视图组件 */

class ReportView extends HTMLElement {
    /* 属性定义 */
    #btnSearch = null; //明细检索按钮
    #btnGenerateRpt = null; //生成汇总报告按钮
    #tblTestDetail = null;  //试验明细列表对象

    #CurrentDetails = [];  //当前显示的试验明细缓存

    #reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern

    constructor() {
        super();

        this.render();
    }

    /* 用户事件响应函数 */
    onSearchClick(event) {
        //获取用户输入的样品编号并提交
        let prodId = document.getElementById("txtProductId").value;
        //提交查询请求        
        fetch(`api/testmaster/gettestinfo/${prodId}`)
            .then(response => response.json())
            .then(data => this.loadTestDetails(data));
    }

    onGenerateRptClick(event) {
        let items = document.querySelectorAll("input[type='checkbox']:checked");
        items.forEach(item => console.log(this.#CurrentDetails[item.value].testid));
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
        }
    }

    /* 加载试验明细 */
    loadTestDetails(data) {
        //清空现有试验明细
        this.clearDetails();
        //添加新明细数据并更新缓存
        data.forEach((detail, index) => {
            this.appendNewDetail(detail, index);
            //添加文本框change事件监听器,以自动更新失重率
            let item = document.getElementById(`txtPostWeight${index}`);
            item.addEventListener('change', (event) => {
                let idx = item.closest('tr').rowIndex - 1; //此处tr索引为其在table中的索引,即包含标题行索引,减去1转换为tbody一致的索引
                //验证用户输入
                if (!this.#reg_float.test(event.target.value)) {
                    event.target.focus();
                    return;
                } else {
                    this.#CurrentDetails[idx].postweight = parseFloat(event.target.value);
                }
                this.#tblTestDetail.rows[idx].cells[11].textContent =
                    ((this.#CurrentDetails[idx].preweight - this.#CurrentDetails[idx].postweight) / this.#CurrentDetails[idx].preweight * 100).toFixed(1);                
            });
        });
        this.#CurrentDetails = data;
    }

    /* 功能: 增加一行试验明细 
     * 参数:
     *       data:JSON - 一条试验明细数据
     *       index     - 当前明细数据在缓存数组中的索引
     */
    appendNewDetail(data,index) {
        let newRow = this.#tblTestDetail.insertRow(-1);
        let Cell1 = newRow.insertCell(0);  //checkbox
        let Cell2 = newRow.insertCell(1);  //试验编号
        let Cell3 = newRow.insertCell(2);  //烧前质量
        let Cell4 = newRow.insertCell(3);  //烧后质量
        let Cell5 = newRow.insertCell(4);  //最高温度TF1
        let Cell6 = newRow.insertCell(5);  //最高温度TF2
        let Cell7 = newRow.insertCell(6);  //终平衡温度TF1
        let Cell8 = newRow.insertCell(7);  //终平衡温度TF2
        let Cell9 = newRow.insertCell(8);  //温升TF1
        let Cell10 = newRow.insertCell(9); //温升TF2
        let Cell11 = newRow.insertCell(10);//火焰持续时间
        let Cell12 = newRow.insertCell(11);//失重率
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
        Cell11.textContent = data.flameduration;
        Cell12.textContent = ((data.preweight - data.postweight) / data.preweight * 100).toFixed(1);
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
                    <button id="btnSearch">检索</button>
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
                            <th></th>
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
                        </tr>
                    </thead>
                    <tbody id="tblDetail">                        
                    </tbody>
                </table>
            </div>
            <!-- 操作按钮 -->
            <div class="action">
                <button id="btnGenerateFinalReport">生成汇总报告</button>
            </div>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('view-report', ReportView);

export { ReportView }