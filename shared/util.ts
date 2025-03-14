import { marshall } from "@aws-sdk/util-dynamodb";
import { Movie, MovieCast } from "./types";

type Entity = Movie | MovieCast;  // 新增 MovieCast

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};
