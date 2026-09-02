declare module "all-the-cities" {
  type WorldCity = {
    cityId: number;
    name: string;
    country: string;
    featureCode: string;
    adminCode: string;
    population: number;
    loc: { type: "Point"; coordinates: [number, number] };
  };

  const cities: WorldCity[];
  export default cities;
}
