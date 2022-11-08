/* 该组件实现传感器数据历史记录列表显示 */

class SensorDataList extends HTMLElement {
    /* 属性定义 */
    #dataTableId;  //该传感器数据列表控件全局ID
    #objDataTable = null; //该传感器显示列表对象引用

    constructor(id) {
        super();

        this.#dataTableId = id;

        this.render();
        //测试代码:动态创建控件ID属性
        var attrId = document.createAttribute("id");
        attrId.value = `_idTableDataList${this.#dataTableId}`;
        this.setAttributeNode(attrId);
    }

    attributeChangedCallback() {
        
    }

    connectedCallback() {
        if (this.#objDataTable === null) {
            this.#objDataTable = document.getElementById(`_idDataTable${this.#dataTableId}`);
        }
    }

    /*
        功能: 在列表第一行插入一条数据
        参数:
            data:JSON - 传感器采集数据 
    */
    appendNewData(data) {
        let newRow = this.#objDataTable.insertRow(0);
        let Cell1 = newRow.insertCell(0); //Timer
        let Cell2 = newRow.insertCell(1); //炉内温度1
        let Cell3 = newRow.insertCell(2); //炉内温度2
        let Cell4 = newRow.insertCell(3); //表面温度
        let Cell5 = newRow.insertCell(4); //中心温度
        Cell1.textContent = Math.round((data.Timer + Number.EPSILON) * 10) / 10;
        Cell2.textContent = Math.round((data.sensorDataCatch.Temp1 + Number.EPSILON) * 10) / 10;
        Cell3.textContent = Math.round((data.sensorDataCatch.Temp2 + Number.EPSILON) * 10) / 10;
        Cell4.textContent = Math.round((data.sensorDataCatch.TempSuf + Number.EPSILON) * 10) / 10;
        Cell5.textContent = Math.round((data.sensorDataCatch.TempCen + Number.EPSILON) * 10) / 10;
    }

    //清空列表显示(排除首行标题栏)
    clear() {
        var i;
        var totallen = this.#objDataTable.rows.length;
        for (i = totallen - 1; i >= 0; i--) {
            this.#objDataTable.deleteRow(i);
        }
    }

    get template() {
        return `
                <table>
                    <thead>
                        <tr>
                            <th>计时(s)</th>
                            <th>炉内温度1(℃)</th>
                            <th>炉内温度2(℃)</th>
                            <th>表面温度(℃)</th>
                            <th>中心温度(℃)</th>
                        </tr>
                    </thead>
                    <tbody id="_idDataTable${this.#dataTableId}">
                    </tbody>
                </table>
                `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('table-sensordata', SensorDataList);

export { SensorDataList }