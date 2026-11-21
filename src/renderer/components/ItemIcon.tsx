import React from 'react';
import type { ItemPick } from '../../shared/types';

interface Props {
  item: ItemPick;
  size?: number;
}

export default function ItemIcon({ item, size = 52 }: Props) {
  return (
    <div className="item-cell" style={{ width: size }} title={`${item.name} · ${item.cost} зол. · ${item.percent}% матчей`}>
      <div className="item-icon" style={{ width: size, height: size }}>
        {item.img ? <img src={item.img} alt="" loading="lazy" /> : <span className="item-fallback">?</span>}
      </div>
      <div className="item-name" title={item.name}>{item.name}</div>
      <div className="item-meta">{item.cost ? `${item.cost}g` : '—'} · {item.percent}%</div>
    </div>
  );
}
