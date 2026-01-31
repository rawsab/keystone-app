import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { OpenMeteoWeatherProvider } from './providers/open-meteo.provider';

@Module({
  providers: [WeatherService, OpenMeteoWeatherProvider],
  exports: [WeatherService],
})
export class WeatherModule {}
