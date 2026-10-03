import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3-shape';

export interface DonutChartData {
  key: string;
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
}

export function DonutChart({ data, size = 200 }: DonutChartProps) {
  const radius = size / 2;
  const pie = d3.pie<DonutChartData>().value(d => d.value).sort(null);
  const arcs = pie(data);

  const arcGenerator = d3.arc<d3.PieArcDatum<DonutChartData>>()
    .outerRadius(radius)
    .innerRadius(radius * 0.5);

  const labelRadius = radius * 0.75;
  const labelArc = d3.arc<d3.PieArcDatum<DonutChartData>>()
    .outerRadius(labelRadius)
    .innerRadius(labelRadius);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G x={size / 2} y={size / 2}>
          {arcs.map((arc) => {
            const percentage = Math.round((arc.data.value / total) * 100);
            if (percentage === 0) return null;
            const centroid = labelArc.centroid(arc);
            return (
              <G key={arc.data.key}>
                <Path d={arcGenerator(arc) as string} fill={arc.data.color} />
                <SvgText
                  x={centroid[0]}
                  y={centroid[1]}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {`${percentage}%`}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
