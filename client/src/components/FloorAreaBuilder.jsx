import React from 'react';

const AREA_TYPE_ICONS = {
  room: '🚪',
  sauna: '🧖‍♂️',
  hall: '🏛️',
  restroom: '🚻',
  kitchen: '🍳',
  lobby: '🏨',
  office: '💼',
  corridor: '🚶',
  other: '📍',
};

const FloorAreaBuilder = ({ floors, onChange, error }) => {
  const addFloor = () => {
    const nextNumber = floors.length + 1;
    const newFloor = {
      floorName: `Floor ${nextNumber}`,
      floorNumber: nextNumber,
      areas: [
        {
          name: `Room 10${nextNumber}`,
          type: 'room',
          description: '',
          estimatedMinutes: 15,
        },
      ],
    };
    onChange([...floors, newFloor]);
  };

  const removeFloor = (floorIdx) => {
    onChange(floors.filter((_, i) => i !== floorIdx));
  };

  const handleFloorNameChange = (floorIdx, name) => {
    const updated = [...floors];
    updated[floorIdx].floorName = name;
    onChange(updated);
  };

  const addArea = (floorIdx, presetType = 'room') => {
    const updated = [...floors];
    const floor = updated[floorIdx];
    const areaCount = floor.areas.length + 1;
    const typeLabel = presetType.charAt(0).toUpperCase() + presetType.slice(1);

    floor.areas.push({
      name: `${typeLabel} ${areaCount}`,
      type: presetType,
      description: '',
      estimatedMinutes: presetType === 'sauna' ? 25 : presetType === 'hall' ? 45 : 15,
    });
    onChange(updated);
  };

  const removeArea = (floorIdx, areaIdx) => {
    const updated = [...floors];
    updated[floorIdx].areas = updated[floorIdx].areas.filter((_, i) => i !== areaIdx);
    onChange(updated);
  };

  const handleAreaChange = (floorIdx, areaIdx, field, value) => {
    const updated = [...floors];
    updated[floorIdx].areas[areaIdx][field] = value;
    onChange(updated);
  };

  const totalAreasCount = floors.reduce((acc, f) => acc + (f.areas?.length || 0), 0);

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '18px 16px',
        marginTop: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🏢</span> Customized Floors & Areas Layout
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Define building levels with customized names, rooms, saunas, halls, and unique zones.
          </div>
        </div>

        <button
          type="button"
          onClick={addFloor}
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#93c5fd',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.2s',
          }}
        >
          <span>➕</span> Add Floor / Level
        </button>
      </div>

      {floors.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: 10,
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          No floors added yet. Click <strong>"➕ Add Floor / Level"</strong> to customize rooms, saunas, and halls.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {floors.map((floor, floorIdx) => (
            <div
              key={floorIdx}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '14px',
              }}
            >
              {/* Floor Header Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16 }}>🏛️</span>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Customized Floor Name (e.g. 1st Floor - Wellness Zone)"
                  value={floor.floorName}
                  onChange={(e) => handleFloorNameChange(floorIdx, e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '8px 12px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                  }}
                  required
                />

                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                  ({floor.areas?.length || 0} areas)
                </span>

                <button
                  type="button"
                  onClick={() => removeFloor(floorIdx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                  title="Remove this entire floor"
                >
                  ✕ Remove Floor
                </button>
              </div>

              {/* Quick Area Add Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  + Add Area:
                </span>
                <button
                  type="button"
                  onClick={() => addArea(floorIdx, 'room')}
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    color: '#93c5fd',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚪 Room
                </button>
                <button
                  type="button"
                  onClick={() => addArea(floorIdx, 'sauna')}
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#fbbf24',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🧖‍♂️ Sauna
                </button>
                <button
                  type="button"
                  onClick={() => addArea(floorIdx, 'hall')}
                  style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    color: '#c084fc',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🏛️ Hall
                </button>
                <button
                  type="button"
                  onClick={() => addArea(floorIdx, 'restroom')}
                  style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    color: '#22d3ee',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🚻 Restroom
                </button>
                <button
                  type="button"
                  onClick={() => addArea(floorIdx, 'other')}
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#34d399',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📍 Custom Zone
                </button>
              </div>

              {/* Areas List */}
              {(!floor.areas || floor.areas.length === 0) ? (
                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                  No areas added on this floor yet. Click one of the buttons above to add rooms, saunas, or halls.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {floor.areas.map((area, areaIdx) => (
                    <div
                      key={areaIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 110px 32px',
                        gap: 8,
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {/* Type Select */}
                      <select
                        className="modal-select"
                        value={area.type || 'room'}
                        onChange={(e) => handleAreaChange(floorIdx, areaIdx, 'type', e.target.value)}
                        style={{ padding: '6px 8px', fontSize: 12 }}
                      >
                        <option value="room">🚪 Room</option>
                        <option value="sauna">🧖‍♂️ Sauna</option>
                        <option value="hall">🏛️ Hall</option>
                        <option value="restroom">🚻 Restroom</option>
                        <option value="kitchen">🍳 Kitchen</option>
                        <option value="lobby">🏨 Lobby</option>
                        <option value="office">💼 Office</option>
                        <option value="corridor">🚶 Corridor</option>
                        <option value="other">📍 Other Zone</option>
                      </select>

                      {/* Unique Area Name Input */}
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="Unique Area Name (e.g. VIP Sauna Suite A)"
                        value={area.name}
                        onChange={(e) => handleAreaChange(floorIdx, areaIdx, 'name', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: 12.5 }}
                        required
                      />

                      {/* Est. Cleaning Minutes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          className="modal-input"
                          placeholder="Mins"
                          value={area.estimatedMinutes || 15}
                          onChange={(e) => handleAreaChange(floorIdx, areaIdx, 'estimatedMinutes', Number(e.target.value))}
                          style={{ padding: '6px 8px', fontSize: 12, width: '100%' }}
                        />
                        <span style={{ fontSize: 11, color: '#64748b' }}>min</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => removeArea(floorIdx, areaIdx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: 14,
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'center',
                        }}
                        title="Remove area"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {floors.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>✓</span> Total: {floors.length} Floor{floors.length > 1 ? 's' : ''} with {totalAreasCount} customized area{totalAreasCount !== 1 ? 's' : ''} configured.
        </div>
      )}
    </div>
  );
};

export default FloorAreaBuilder;
