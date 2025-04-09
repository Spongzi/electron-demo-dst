import React from 'react';
import {Card, Col, Row} from 'antd';

interface Data {
  position: number | string;
  pressure: number | string;
  displacement: number | string;
}

interface DataShowProps {
  data: Data;
}

const DataShow: React.FC<DataShowProps> = ({data}) => {
  return (
    <Row gutter={8}>
      <Col span={8}>
        <Card title="位置">
          {data.position}
        </Card>
      </Col>
      <Col span={8}>
        <Card title="压力">
          {data.pressure}
        </Card>
      </Col>
      <Col span={8}>
        <Card title="位移速度">
          {data.displacement}
        </Card>
      </Col>
    </Row>
  );
};

export default DataShow;
