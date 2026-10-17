import { capsule, chamferedBox, circlePolygon } from "../../geometry/poly.ts";
import { vec } from "../../geometry/vec.ts";
import type { BodyMetrics } from "../body.ts";
import { edgeBand, garmentBand, shape, skinLimb, type PartGeometry } from "./types.ts";

export function buildThigh(body: BodyMetrics): PartGeometry {
  const { thighLength, thighTopRadius, thighKneeRadius, shortsLength } = body;
  const shortsHem = -Math.min(shortsLength, thighLength * 0.55);
  const hemRadius = thighKneeRadius + (thighTopRadius - thighKneeRadius) * (shortsLength / thighLength) + 0.002;
  return {
    id: "thigh",
    label: "Thigh",
    length: thighLength,
    origin: vec(0, 0),
    tip: vec(0, -thighLength),
    shapes: [
      ...skinLimb(thighLength, thighTopRadius, thighKneeRadius),
      ...garmentBand(vec(0, 0.006), vec(0, shortsHem), thighTopRadius + 0.003, hemRadius, "shorts", "shortsShade", "shortsLight"),
      shape(edgeBand(vec(0, 0.004), vec(0, shortsHem * 0.94), thighTopRadius * 0.72, hemRadius * 0.7, 1, 0.32), "stripe"),
      shape(edgeBand(vec(0, shortsHem), vec(0, shortsHem - 0.012), hemRadius, hemRadius * 0.96, -1, 0.9), "shortsShade"),
    ],
  };
}

export function buildShin(body: BodyMetrics): PartGeometry {
  const { shinLength, shinKneeRadius, shinAnkleRadius, sockHeight } = body;
  const sockTop = -shinLength + sockHeight;
  const sockTopRadius = shinAnkleRadius + (shinKneeRadius - shinAnkleRadius) * (sockHeight / shinLength) + 0.003;
  return {
    id: "shin",
    label: "Shin",
    length: shinLength,
    origin: vec(0, 0),
    tip: vec(0, -shinLength),
    shapes: [
      ...skinLimb(shinLength, shinKneeRadius, shinAnkleRadius),
      ...garmentBand(vec(0, sockTop), vec(0, -shinLength - 0.002), sockTopRadius, shinAnkleRadius + 0.004, "sock", "sockShade", "sockLight"),
      shape(capsule(vec(0, sockTop), vec(0, sockTop + 0.012), sockTopRadius + 0.002, sockTopRadius + 0.002), "sockShade"),
    ],
  };
}

export function buildUpperArm(body: BodyMetrics): PartGeometry {
  const { upperArmLength, upperArmTopRadius, upperArmElbowRadius, sleeveLength } = body;
  const sleeveHem = -sleeveLength;
  const sleeveRadius = upperArmElbowRadius + (upperArmTopRadius - upperArmElbowRadius) * (sleeveLength / upperArmLength) + 0.007;
  return {
    id: "upperArm",
    label: "Upper arm",
    length: upperArmLength,
    origin: vec(0, 0),
    tip: vec(0, -upperArmLength),
    shapes: [
      ...skinLimb(upperArmLength, upperArmTopRadius, upperArmElbowRadius),
      ...garmentBand(vec(0, 0.004), vec(0, sleeveHem), upperArmTopRadius + 0.004, sleeveRadius, "shirt", "shirtShade", "shirtLight"),
      shape(edgeBand(vec(0, sleeveHem - 0.008), vec(0, sleeveHem - 0.018), sleeveRadius * 0.98, sleeveRadius * 0.92, -1, 0.8), "shirtShade"),
    ],
  };
}

export function buildForearm(body: BodyMetrics): PartGeometry {
  const { forearmLength, forearmElbowRadius, forearmWristRadius, handRadius } = body;
  const wrist = -forearmLength;
  return {
    id: "forearm",
    label: "Forearm + fist",
    length: forearmLength,
    origin: vec(0, 0),
    tip: vec(0, wrist - handRadius),
    shapes: [
      ...skinLimb(forearmLength, forearmElbowRadius, forearmWristRadius),
      shape(circlePolygon(vec(0.002, wrist - handRadius * 0.55), handRadius, handRadius * 1.02, 18), "skin"),
      shape(circlePolygon(vec(-0.004, wrist - handRadius * 0.7), handRadius * 0.7, handRadius * 0.55, 14), "skinShade"),
      shape(circlePolygon(vec(0.014, wrist - handRadius * 0.8), handRadius * 0.34, handRadius * 0.34, 10), "skinLight"),
      shape(chamferedBox(vec(0.012, wrist - 0.004), 0.012, 0.006, 0.003), "skinShade"),
    ],
  };
}
