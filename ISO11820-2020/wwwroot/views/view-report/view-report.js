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
        
        //验证所有明细行的残余质量录入情况
        //...
        //构造数据结构用于上传
        let updata = {
            indexes: [],
            details:[]
        }
        items.forEach(item => updata.indexes.push(item.value));
        updata.details = this.#CurrentDetails;

        console.log(updata);

        let option = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updata)
        }
        
        fetch("api/testmaster/generatereport", option)
            .then(response => response.json())
            .then(data => console.log(data));
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
                let cell = this.#tblTestDetail.rows[idx].cells[11];
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
                <button id="btnGenerateFinalReport" class="cmdbutton">生成汇总报告</button>
            </div>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('view-report', ReportView);

export { ReportView }