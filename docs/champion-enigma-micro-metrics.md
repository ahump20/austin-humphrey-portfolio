# Champion Enigma Engine: Micro-Mechanics Metrics Stub

## Metric Inventory
| Metric Key | Domain | Primary Signals | Description | Early Thresholds |
| --- | --- | --- | --- | --- |
| hip_torque_index | Baseball Pitching/Hitting | Peak pelvis angular velocity, hip-shoulder separation | Captures lower-half rotational power transfer relative to league norms. | Elite: > +1.0 z-score; Watch: < -0.5 z-score |
| separation_stability | Baseball Pitching/Hitting | Variance of hip-shoulder separation, trunk timing jitter | Measures repeatability of launch mechanics across attempts. | Stable: variance < 5°; Volatile: variance ≥ 10° |
| first_step_explosiveness | Football Skill, Basketball Perimeter | Ground contact time, horizontal impulse, torso angle at 200 ms | Quantifies first-step burst and ability to displace center of mass quickly. | Elite: contact < 140 ms & impulse > +0.8 z-score |
| reacceleration_efficiency | Football Skill, Basketball Guards | Time to regain top speed, braking-to-drive sequence | Scores ability to decelerate and reaccelerate without excess sway. | Efficient: reaccel < 320 ms; Risk: > 400 ms |
| hip_ir_capacity | Baseball Pitching, Football QB, Basketball Wings | Peak hip internal rotation ROM, timing vs. trunk rotation | Flags mobility ceilings impacting velocity and injury risk. | Optimal: ROM 45°–55°; Restricted: < 35° |
| trunk_whip_ratio | Baseball Pitching, Football QB | Trunk angular velocity / pelvis angular velocity at release | Highlights torso contribution and potential elbow stress indicators. | Optimal: 1.2–1.6; Risk: > 1.8 |
| launch_axis_consistency | Baseball Hitting, Football WR | Bat/limb plane deviation, COM lead percentage | Measures ability to drive power along intended axis. | Consistent: plane dev < 4° |
| fatigue_mechanic_drift | Multi-sport | Feature deltas late-game vs. baseline | Surfaces degradation patterns tied to Clutch/Consistency traits. | Alert: > 15% degradation |

## Lightweight Data Schema

```yaml
version: 0.1.0
sources:
  - id: kinatrax_pitch
    sport: baseball
    sampling_hz: 300
    joints: [pelvis, trunk, shoulder_l, shoulder_r, hip_l, hip_r, knee_l, knee_r, ankle_l, ankle_r]
  - id: hawkeye_basketball
    sport: basketball
    sampling_hz: 120
    joints: [pelvis, trunk, hip_l, hip_r, knee_l, knee_r, ankle_l, ankle_r, foot_l, foot_r]

entities:
  athlete:
    keys: [athlete_id]
    traits: [handedness, dominant_leg, position, competition_level]
  event:
    keys: [event_id]
    attributes: [sport, phase, timestamp_utc, fatigue_state]
    enums:
      phase: [first_step, load, launch, decel, follow_through]

frames:
  schema:
    - name: athlete_id
      type: uuid
    - name: event_id
      type: uuid
    - name: frame_ts
      type: datetime
    - name: joint
      type: enum
      values: [pelvis, trunk, hip_l, hip_r, knee_l, knee_r, ankle_l, ankle_r, shoulder_l, shoulder_r, foot_l, foot_r]
    - name: position
      type: vector3
    - name: velocity
      type: vector3
    - name: acceleration
      type: vector3

features:
  schema:
    - name: feature_id
      type: string
    - name: athlete_id
      type: uuid
    - name: event_id
      type: uuid
    - name: metric_key
      type: enum
      values: [hip_torque_index, separation_stability, first_step_explosiveness, reacceleration_efficiency, hip_ir_capacity, trunk_whip_ratio, launch_axis_consistency, fatigue_mechanic_drift]
    - name: value
      type: float
    - name: z_score
      type: float
    - name: threshold_flag
      type: enum
      values: [elite, optimal, neutral, watch, risk]
    - name: context
      type: object
      description: Additional metadata (e.g., handedness, play type)

thresholds:
  hip_torque_index:
    elite: "> 1.0"
    watch: "< -0.5"
  separation_stability:
    elite: "variance < 5"
    risk: "variance >= 10"
  first_step_explosiveness:
    elite: "contact_time_ms < 140 and impulse_z > 0.8"
    risk: "contact_time_ms > 180"
  reacceleration_efficiency:
    elite: "time_ms < 320"
    risk: "time_ms > 400"
  hip_ir_capacity:
    elite: "rom_deg between 45 and 55"
    risk: "rom_deg < 35"
  trunk_whip_ratio:
    elite: "ratio between 1.2 and 1.6"
    risk: "ratio > 1.8"
  launch_axis_consistency:
    elite: "plane_dev_deg < 4"
    risk: "plane_dev_deg > 8"
  fatigue_mechanic_drift:
    elite: "delta_percent < 5"
    risk: "delta_percent > 15"
```

## Integration Notes
- Normalize all feature z-scores within sport, position group, handedness, and competition level cohorts.
- Emit risk flags to the Champion Enigma Engine alongside upside dimensions so coaches get pathway + pitfalls in one view.
- Tag video frame ranges for each feature to auto-generate clip reels (e.g., top first-step bursts) in the coach dashboard.
- Feed deficits directly into the training planner to target high-leverage weaknesses.
